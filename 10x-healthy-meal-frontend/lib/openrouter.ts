import { OpenRouterService } from './services/openRouterService';
import { OpenRouterConfig } from './types/openrouter';

// Validate required environment variables
function validateEnvironment(): void {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }
}

// Create OpenRouter service configuration
function createOpenRouterConfig(): OpenRouterConfig {
  validateEnvironment();

  return {
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3-sonnet',
    timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '30000', 10),
    maxRetries: parseInt(process.env.OPENROUTER_MAX_RETRIES || '3', 10),
    defaultParameters: {
      temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '2000', 10),
      topP: parseFloat(process.env.OPENROUTER_TOP_P || '0.9'),
      frequencyPenalty: parseFloat(process.env.OPENROUTER_FREQUENCY_PENALTY || '0'),
      presencePenalty: parseFloat(process.env.OPENROUTER_PRESENCE_PENALTY || '0'),
    }
  };
}

// Create and export OpenRouter service instance
let openRouterServiceInstance: OpenRouterService | null = null;

export function getOpenRouterService(): OpenRouterService {
  if (!openRouterServiceInstance) {
    const config = createOpenRouterConfig();
    openRouterServiceInstance = new OpenRouterService(config);
  }
  return openRouterServiceInstance;
}

// Export the service instance (singleton pattern)
export const openRouterService = getOpenRouterService();

// Export types for convenience
export type {
  OpenRouterConfig,
  ModelParameters,
  RecipeModificationResult,
  GenerationOptions,
  ModelInfo
} from './types/openrouter';

// Export errors for error handling
export {
  OpenRouterError,
  OpenRouterAuthenticationError,
  OpenRouterRateLimitError,
  OpenRouterValidationError,
  OpenRouterTimeoutError,
  OpenRouterServiceUnavailableError,
  OpenRouterResponseParsingError,
  OpenRouterConfigurationError,
  OpenRouterNetworkError,
  OpenRouterModelUnavailableError,
  OpenRouterQuotaExceededError
} from './errors/openrouter-errors';

// Utility function to check if OpenRouter is properly configured
export async function checkOpenRouterHealth(): Promise<{
  isConfigured: boolean;
  isApiKeyValid: boolean;
  error?: string;
}> {
  try {
    const service = getOpenRouterService();
    const isApiKeyValid = await service.validateApiKey();
    
    return {
      isConfigured: true,
      isApiKeyValid
    };
  } catch (error) {
    return {
      isConfigured: false,
      isApiKeyValid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Utility function to get available models (cached for performance)
let cachedModels: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getAvailableModels(forceRefresh = false): Promise<any[]> {
  const now = Date.now();
  
  if (!forceRefresh && cachedModels && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedModels;
  }
  
  try {
    const service = getOpenRouterService();
    const models = await service.getAvailableModels();
    
    cachedModels = models;
    cacheTimestamp = now;
    
    return models;
  } catch (error) {
    console.error('Failed to fetch available models:', error);
    return cachedModels || [];
  }
}

// Development helper function to test the service
export async function testOpenRouterService(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('testOpenRouterService should only be used in development');
    return;
  }

  try {
    console.log('Testing OpenRouter service...');
    
    const health = await checkOpenRouterHealth();
    console.log('Health check:', health);
    
    if (health.isApiKeyValid) {
      const models = await getAvailableModels();
      console.log(`Available models: ${models.length}`);
      
      // Test a simple recipe modification
      const service = getOpenRouterService();
      const result = await service.generateRecipeModification(
        'Spaghetti Carbonara: Cook pasta, mix with eggs, cheese, and bacon.',
        'Make it vegetarian',
        'I prefer plant-based alternatives'
      );
      
      console.log('Test modification successful:', {
        generationId: result.generationId,
        model: result.model,
        tokensUsed: result.tokensUsed,
        changesCount: result.changesMade.length
      });
    }
  } catch (error) {
    console.error('OpenRouter service test failed:', error);
  }
} 