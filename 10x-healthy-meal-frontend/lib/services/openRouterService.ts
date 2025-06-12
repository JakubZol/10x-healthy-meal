import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  OpenRouterConfig,
  ModelParameters,
  Message,
  SystemMessage,
  UserMessage,
  ResponseFormat,
  OpenRouterRequest,
  OpenRouterResponse,
  RecipeModificationResult,
  GenerationOptions,
  ModelInfo,
  RetryConfig,
  RecipeModificationResponse
} from '../types/openrouter';
import {
  validateOpenRouterConfig,
  validateRecipeModificationInput,
  validateOpenRouterResponse,
  validateRecipeModificationResponse
} from '../validation/openrouter';
import {
  OpenRouterError,
  OpenRouterConfigurationError,
  OpenRouterAuthenticationError,
  OpenRouterValidationError,
  OpenRouterTimeoutError,
  OpenRouterServiceUnavailableError,
  OpenRouterResponseParsingError,
  createOpenRouterError
} from '../errors/openrouter-errors';
import { RetryHandler, CircuitBreaker } from '../utils/retry';

export class OpenRouterService {
  private config: OpenRouterConfig;
  private httpClient: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private retryConfig: RetryConfig;

  constructor(config: OpenRouterConfig) {
    try {
      // Validate configuration using Zod
      this.config = validateOpenRouterConfig(config);
    } catch (error) {
      throw new OpenRouterConfigurationError('Invalid OpenRouter configuration', error);
    }

    // Setup retry configuration
    this.retryConfig = {
      maxRetries: this.config.maxRetries ?? 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    };

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(5, 60000);

    // Setup HTTP client
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl || 'https://openrouter.ai/api/v1',
      timeout: this.config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'HealthyMealAI'
      }
    });

    this.setupInterceptors();
  }

  /**
   * Main method for generating recipe modifications
   */
  async generateRecipeModification(
    originalRecipe: string,
    modificationPrompt: string,
    userPreferences?: string,
    options?: GenerationOptions
  ): Promise<RecipeModificationResult> {
    try {
      // Validate input
      const validatedInput = validateRecipeModificationInput({
        originalRecipe,
        modificationPrompt,
        userPreferences
      });

      // Build messages
      const systemMessage = this.buildSystemMessage(validatedInput.userPreferences);
      const userMessage = this.buildUserMessage(validatedInput.originalRecipe, validatedInput.modificationPrompt);
      const messages = [systemMessage, userMessage];

      // Build response format
      const responseFormat = this.buildResponseFormat();

      // Determine model and parameters
      const model = options?.model || this.config.defaultModel || 'anthropic/claude-3-sonnet';
      const parameters = { ...this.config.defaultParameters, ...options?.parameters };

      // Build request
      const request = this.buildRequest(messages, model, parameters, responseFormat);

      // Execute request with retry logic and circuit breaker
      const response = await this.circuitBreaker.execute(() =>
        RetryHandler.executeWithRetry(
          () => this.executeRequest(request),
          {
            maxRetries: this.retryConfig.maxRetries,
            baseDelay: this.retryConfig.baseDelay,
            onRetry: (error, attempt) => {
              console.warn(`OpenRouter request failed, retrying (${attempt}/${this.retryConfig.maxRetries})`, error.message);
            }
          }
        )
      );

      // Validate and parse response
      return this.validateResponse(response, model);

    } catch (error) {
      this.handleApiError(error);
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.httpClient.get('/auth/key');
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }
      throw this.handleApiError(error);
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.httpClient.get('/models');
      return response.data.data || [];
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Update service configuration
   */
  updateConfiguration(newConfig: Partial<OpenRouterConfig>): void {
    try {
      const updatedConfig = { ...this.config, ...newConfig };
      this.config = validateOpenRouterConfig(updatedConfig);
      
      // Update HTTP client if necessary
      if (newConfig.apiKey) {
        this.httpClient.defaults.headers['Authorization'] = `Bearer ${newConfig.apiKey}`;
      }
      if (newConfig.baseUrl) {
        this.httpClient.defaults.baseURL = newConfig.baseUrl;
      }
      if (newConfig.timeout) {
        this.httpClient.defaults.timeout = newConfig.timeout;
      }
    } catch (error) {
      throw new OpenRouterConfigurationError('Failed to update configuration', error);
    }
  }

  /**
   * Build system message with user preferences
   */
  private buildSystemMessage(userPreferences?: string): SystemMessage {
    let systemContent = "You are a helpful cooking assistant that modifies recipes based on dietary preferences and instructions. ";
    systemContent += "Always respond with a valid JSON object containing the modified recipe and list of changes made.";
    
    if (userPreferences) {
      systemContent += ` User's dietary preferences: ${userPreferences}`;
    }
    
    systemContent += " Focus on maintaining the essence of the original recipe while incorporating the requested modifications.";
    
    return {
      role: "system",
      content: systemContent
    };
  }

  /**
   * Build user message with recipe and instructions
   */
  private buildUserMessage(originalRecipe: string, modificationPrompt: string): UserMessage {
    const userContent = `Please modify the following recipe according to the given instructions:

Original Recipe:
${originalRecipe}

Modification Instructions:
${modificationPrompt}

Please provide the modified recipe and explain what changes were made. Consider any dietary preferences mentioned in the system message.`;

    return {
      role: "user",
      content: userContent
    };
  }

  /**
   * Build response format for structured JSON responses
   */
  private buildResponseFormat(): ResponseFormat {
    return {
      type: "json_schema",
      json_schema: {
        name: "recipe_modification_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            modified_recipe: {
              type: "string",
              description: "The complete modified recipe text"
            },
            changes_made: {
              type: "array",
              items: {
                type: "string"
              },
              description: "List of specific changes made to the original recipe"
            },
            dietary_considerations: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Dietary considerations addressed in the modification"
            }
          },
          required: ["modified_recipe", "changes_made"],
          additionalProperties: false
        }
      }
    };
  }

  /**
   * Build complete request to OpenRouter API
   */
  private buildRequest(
    messages: Message[],
    model: string,
    parameters: ModelParameters,
    responseFormat: ResponseFormat
  ): OpenRouterRequest {
    return {
      model: model,
      messages: messages,
      response_format: responseFormat,
      temperature: parameters.temperature ?? 0.7,
      max_tokens: parameters.maxTokens ?? 2000,
      top_p: parameters.topP ?? 0.9,
      frequency_penalty: parameters.frequencyPenalty ?? 0,
      presence_penalty: parameters.presencePenalty ?? 0
    };
  }

  /**
   * Execute HTTP request to OpenRouter API
   */
  private async executeRequest(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    try {
      const response: AxiosResponse<OpenRouterResponse> = await this.httpClient.post('/chat/completions', request);
      return validateOpenRouterResponse(response.data);
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  /**
   * Validate and parse API response
   */
  private validateResponse(response: OpenRouterResponse, model: string): RecipeModificationResult {
    try {
      if (!response.choices || response.choices.length === 0) {
        throw new OpenRouterResponseParsingError('No choices in response');
      }

      const choice = response.choices[0];
      if (!choice.message || !choice.message.content) {
        throw new OpenRouterResponseParsingError('No content in response message');
      }

      // Parse JSON content
      let parsedContent: RecipeModificationResponse;
      try {
        parsedContent = JSON.parse(choice.message.content);
      } catch (parseError) {
        throw new OpenRouterResponseParsingError('Failed to parse JSON response', parseError);
      }

      // Validate parsed content
      const validatedContent = validateRecipeModificationResponse(parsedContent);

      // Generate unique ID for this generation
      const generationId = uuidv4();

      return {
        modifiedRecipe: validatedContent.modified_recipe,
        changesMade: validatedContent.changes_made,
        dietaryConsiderations: validatedContent.dietary_considerations,
        generationId,
        model,
        tokensUsed: response.usage.total_tokens
      };

    } catch (error) {
      if (error instanceof OpenRouterError) {
        throw error;
      }
      throw new OpenRouterResponseParsingError('Failed to validate response', error);
    }
  }

  /**
   * Setup HTTP client interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        console.log(`OpenRouter API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('OpenRouter API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        console.log(`OpenRouter API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('OpenRouter API Response Error:', error.response?.status, error.response?.statusText);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Central error handling
   */
  private handleApiError(error: any): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;

      if (status) {
        throw createOpenRouterError(status, message, error);
      }

      // Network errors without response
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new OpenRouterTimeoutError('Request timed out', error);
      }

      throw new OpenRouterServiceUnavailableError('Network error occurred', error);
    }

    if (error instanceof OpenRouterError) {
      throw error;
    }

    throw new OpenRouterServiceUnavailableError('Unknown error occurred', error);
  }
} 