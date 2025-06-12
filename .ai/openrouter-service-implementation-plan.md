# Plan Implementacji Usługi OpenRouter

## 1. Opis usługi

OpenRouterService to centralna usługa odpowiedzialna za komunikację z OpenRouter.ai API w aplikacji HealthyMealAI. Usługa zapewnia bezpieczną, niezawodną i typowaną integrację z modelami LLM poprzez OpenRouter, umożliwiając generowanie zmodyfikowanych przepisów kulinarnych na podstawie preferencji użytkowników.

### Główne funkcjonalności:
- Bezpieczna komunikacja z OpenRouter API
- Strukturalne formatowanie requestów i odpowiedzi
- Obsługa błędów i retry logic
- Walidacja danych wejściowych i wyjściowych
- Konfiguracja modeli i parametrów
- Logging i monitoring

## 2. Opis konstruktora

```typescript
class OpenRouterService {
  constructor(config: OpenRouterConfig) {
    // Inicjalizacja konfiguracji, walidacja API key, setup HTTP client
  }
}

interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  defaultParameters?: ModelParameters;
}
```

### Parametry konstruktora:
- **apiKey**: Klucz API OpenRouter (wymagany)
- **baseUrl**: URL bazowy API (domyślnie: https://openrouter.ai/api/v1)
- **defaultModel**: Domyślny model LLM (domyślnie: anthropic/claude-3-sonnet)
- **timeout**: Timeout requestów w ms (domyślnie: 30000)
- **maxRetries**: Maksymalna liczba ponownych prób (domyślnie: 3)
- **defaultParameters**: Domyślne parametry modelu

## 3. Publiczne metody i pola

### 3.1. generateRecipeModification()

```typescript
async generateRecipeModification(
  originalRecipe: string,
  modificationPrompt: string,
  userPreferences?: string,
  options?: GenerationOptions
): Promise<RecipeModificationResult>
```

**Cel**: Główna metoda do generowania zmodyfikowanych przepisów

**Parametry**:
- `originalRecipe`: Oryginalny tekst przepisu
- `modificationPrompt`: Instrukcje modyfikacji od użytkownika
- `userPreferences`: Preferencje żywieniowe użytkownika (opcjonalne)
- `options`: Dodatkowe opcje generowania (model, parametry)

**Zwraca**: Promise z wynikiem modyfikacji przepisu

### 3.2. validateApiKey()

```typescript
async validateApiKey(): Promise<boolean>
```

**Cel**: Walidacja poprawności klucza API

### 3.3. getAvailableModels()

```typescript
async getAvailableModels(): Promise<ModelInfo[]>
```

**Cel**: Pobranie listy dostępnych modeli

### 3.4. updateConfiguration()

```typescript
updateConfiguration(newConfig: Partial<OpenRouterConfig>): void
```

**Cel**: Aktualizacja konfiguracji usługi

## 4. Prywatne metody i pola

### 4.1. Pola prywatne

```typescript
private config: OpenRouterConfig;
private httpClient: AxiosInstance;
private logger: Logger;
private retryConfig: RetryConfig;
```

### 4.2. buildSystemMessage()

```typescript
private buildSystemMessage(userPreferences?: string): SystemMessage
```

**Cel**: Konstruowanie komunikatu systemowego z preferencjami użytkownika

**Przykład implementacji**:
```typescript
private buildSystemMessage(userPreferences?: string): SystemMessage {
  let systemContent = "You are a helpful cooking assistant that modifies recipes based on dietary preferences and instructions.";
  
  if (userPreferences) {
    systemContent += ` User's dietary preferences: ${userPreferences}`;
  }
  
  systemContent += " Always respond with a valid JSON object containing the modified recipe and list of changes made.";
  
  return {
    role: "system",
    content: systemContent
  };
}
```

### 4.3. buildUserMessage()

```typescript
private buildUserMessage(originalRecipe: string, modificationPrompt: string): UserMessage
```

**Cel**: Konstruowanie komunikatu użytkownika z przepisem i instrukcjami

**Przykład implementacji**:
```typescript
private buildUserMessage(originalRecipe: string, modificationPrompt: string): UserMessage {
  const userContent = `Please modify the following recipe according to the given instructions:

Original Recipe:
${originalRecipe}

Modification Instructions:
${modificationPrompt}

Please provide the modified recipe and explain what changes were made.`;

  return {
    role: "user",
    content: userContent
  };
}
```

### 4.4. buildResponseFormat()

```typescript
private buildResponseFormat(): ResponseFormat
```

**Cel**: Konstruowanie schematu JSON dla ustrukturyzowanych odpowiedzi

**Przykład implementacji**:
```typescript
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
```

### 4.5. buildRequest()

```typescript
private buildRequest(
  messages: Message[],
  model: string,
  parameters: ModelParameters,
  responseFormat: ResponseFormat
): OpenRouterRequest
```

**Cel**: Konstruowanie kompletnego requestu do OpenRouter API

**Przykład implementacji**:
```typescript
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
```

### 4.6. executeRequest()

```typescript
private async executeRequest(request: OpenRouterRequest): Promise<OpenRouterResponse>
```

**Cel**: Wykonanie HTTP requestu z retry logic

### 4.7. validateResponse()

```typescript
private validateResponse(response: any): RecipeModificationResult
```

**Cel**: Walidacja i parsowanie odpowiedzi z API

### 4.8. handleApiError()

```typescript
private handleApiError(error: any): never
```

**Cel**: Centralna obsługa błędów API

## 5. Obsługa błędów

### 5.1. Hierarchia błędów

```typescript
abstract class OpenRouterError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
}

class OpenRouterAuthenticationError extends OpenRouterError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
}

class OpenRouterRateLimitError extends OpenRouterError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly statusCode = 429;
}

class OpenRouterValidationError extends OpenRouterError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
}

class OpenRouterTimeoutError extends OpenRouterError {
  readonly code = 'TIMEOUT_ERROR';
  readonly statusCode = 408;
}

class OpenRouterServiceUnavailableError extends OpenRouterError {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly statusCode = 503;
}
```

### 5.2. Scenariusze błędów

1. **Network Errors**: Timeout, connection refused
   - Retry z exponential backoff
   - Fallback na cached response (jeśli dostępny)

2. **Authentication Errors**: Nieprawidłowy API key
   - Immediate failure bez retry
   - Clear error message dla developera

3. **Rate Limiting**: Przekroczenie limitów API
   - Retry z odpowiednim delay
   - Exponential backoff

4. **Validation Errors**: Nieprawidłowy format requestu
   - Immediate failure
   - Detailed validation errors

5. **Model Unavailable**: Wybrany model niedostępny
   - Fallback na domyślny model
   - Logging warning

6. **Response Parsing Errors**: Nieprawidłowa odpowiedź
   - Retry request
   - Fallback parsing strategy

7. **Schema Validation Errors**: Odpowiedź nie pasuje do schematu
   - Attempt graceful parsing
   - Log validation errors

8. **Service Unavailable**: OpenRouter API niedostępne
   - Retry z backoff
   - Circuit breaker pattern

## 6. Kwestie bezpieczeństwa

### 6.1. API Key Management
- Przechowywanie w zmiennych środowiskowych
- Nigdy nie logowanie API key
- Walidacja formatu klucza

### 6.2. Input Sanitization
- Walidacja długości inputów
- Sanityzacja specjalnych znaków
- Rate limiting na poziomie aplikacji

### 6.3. Response Validation
- Strict schema validation
- Content filtering
- Size limits dla odpowiedzi

### 6.4. Logging Security
- Nie logowanie wrażliwych danych
- Structured logging z poziomami
- Audit trail dla API calls

## 7. Plan wdrożenia krok po kroku

### Krok 1: Setup projektu i zależności

```bash
# Instalacja zależności
npm install axios zod
npm install --save-dev @types/node

# Konfiguracja zmiennych środowiskowych
echo "OPENROUTER_API_KEY=your_api_key_here" >> .env.local
echo "OPENROUTER_BASE_URL=https://openrouter.ai/api/v1" >> .env.local
```

### Krok 2: Definicja typów i interfejsów

```typescript
// src/types/openrouter.ts
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  defaultParameters?: ModelParameters;
}

export interface ModelParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: object;
  };
}

export interface RecipeModificationResult {
  modifiedRecipe: string;
  changesMade: string[];
  dietaryConsiderations?: string[];
  generationId: string;
  model: string;
  tokensUsed: number;
}
```

### Krok 3: Implementacja walidacji Zod

```typescript
// src/lib/validation/openrouter.ts
import { z } from 'zod';

export const OpenRouterConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().optional(),
  timeout: z.number().positive().optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  defaultParameters: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
  }).optional(),
});

export const RecipeModificationInputSchema = z.object({
  originalRecipe: z.string().min(10).max(10000),
  modificationPrompt: z.string().min(1).max(500),
  userPreferences: z.string().max(1000).optional(),
});
```

### Krok 4: Implementacja klasy błędów

```typescript
// src/lib/errors/openrouter-errors.ts
export abstract class OpenRouterError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Implementacja konkretnych klas błędów...
```

### Krok 5: Implementacja głównej klasy usługi

```typescript
// src/services/openRouterService.ts
import axios, { AxiosInstance } from 'axios';
import { OpenRouterConfig, RecipeModificationResult } from '../types/openrouter';
import { OpenRouterConfigSchema, RecipeModificationInputSchema } from '../lib/validation/openrouter';

export class OpenRouterService {
  private config: OpenRouterConfig;
  private httpClient: AxiosInstance;
  
  constructor(config: OpenRouterConfig) {
    // Walidacja konfiguracji
    this.config = OpenRouterConfigSchema.parse(config);
    
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
  
  // Implementacja metod publicznych i prywatnych...
}
```

### Krok 6: Implementacja retry logic

```typescript
// src/lib/utils/retry.ts
export class RetryHandler {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
  
  private static isRetryableError(error: any): boolean {
    // Implementacja logiki określającej czy błąd jest retryable
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Krok 7: Konfiguracja w Next.js

```typescript
// src/lib/openrouter.ts
import { OpenRouterService } from '../services/openRouterService';

const openRouterService = new OpenRouterService({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseUrl: process.env.OPENROUTER_BASE_URL,
  defaultModel: 'anthropic/claude-3-sonnet',
  timeout: 30000,
  maxRetries: 3,
  defaultParameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9
  }
});

export { openRouterService };
```

### Krok 8: Integracja z API routes

```typescript
// src/app/api/recipes/generate/route.ts
import { openRouterService } from '../../../../lib/openrouter';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { originalRecipe, modificationPrompt, userPreferences } = await request.json();
    
    const result = await openRouterService.generateRecipeModification(
      originalRecipe,
      modificationPrompt,
      userPreferences
    );
    
    return NextResponse.json(result);
  } catch (error) {
    // Error handling
    return NextResponse.json(
      { error: 'Recipe generation failed' },
      { status: 500 }
    );
  }
}
```

### Krok 9: Testowanie

```typescript
// src/services/__tests__/openRouterService.test.ts
import { OpenRouterService } from '../openRouterService';

describe('OpenRouterService', () => {
  let service: OpenRouterService;
  
  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: 'test-api-key'
    });
  });
  
  describe('generateRecipeModification', () => {
    it('should generate modified recipe successfully', async () => {
      // Test implementation
    });
    
    it('should handle API errors gracefully', async () => {
      // Test implementation
    });
  });
});
```

### Krok 10: Monitoring i logging

```typescript
// src/lib/logger.ts
export class Logger {
  static info(message: string, meta?: any) {
    console.log(`[INFO] ${message}`, meta);
  }
  
  static error(message: string, error?: any) {
    console.error(`[ERROR] ${message}`, error);
  }
  
  static warn(message: string, meta?: any) {
    console.warn(`[WARN] ${message}`, meta);
  }
}
```

### Krok 11: Deployment i konfiguracja produkcyjna

1. **Zmienne środowiskowe w produkcji**:
   ```bash
   OPENROUTER_API_KEY=prod_api_key
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   ```

2. **Rate limiting**:
   - Implementacja na poziomie aplikacji
   - Monitoring usage

3. **Monitoring**:
   - Health checks
   - Performance metrics
   - Error tracking

4. **Security**:
   - API key rotation
   - Request/response logging (bez wrażliwych danych)
   - Input validation

Ten plan implementacji zapewnia kompleksowe, bezpieczne i skalowalne rozwiązanie dla integracji z OpenRouter API w aplikacji HealthyMealAI, wykorzystując najlepsze praktyki dla Next.js i TypeScript. 