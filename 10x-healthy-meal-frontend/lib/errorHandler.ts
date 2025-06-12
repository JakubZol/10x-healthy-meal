import { NextRequest, NextResponse } from 'next/server';

// Error types for better error handling
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  details?: string;
  timestamp: string;
}

// Custom error class
export class ApiError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly details?: string;

  constructor(type: ErrorType, message: string, details?: string) {
    super(message);
    this.type = type;
    this.details = details;
    this.statusCode = this.getStatusCode(type);
    this.name = 'ApiError';
  }

  private getStatusCode(type: ErrorType): number {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        return 400;
      case ErrorType.AUTHENTICATION_ERROR:
        return 401;
      case ErrorType.AUTHORIZATION_ERROR:
        return 403;
      case ErrorType.NOT_FOUND_ERROR:
        return 404;
      case ErrorType.TIMEOUT_ERROR:
        return 408;
      case ErrorType.CONFLICT_ERROR:
        return 409;
      case ErrorType.INTERNAL_SERVER_ERROR:
        return 500;
      case ErrorType.AI_SERVICE_ERROR:
      case ErrorType.EXTERNAL_SERVICE_ERROR:
        return 502;
      case ErrorType.INTERNAL_SERVER_ERROR:
      default:
        return 500;
    }
  }
}

// Error handler function
export function handleApiError(error: unknown, request: NextRequest): NextResponse {
  console.error('API Error:', {
    url: request.url,
    method: request.method,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Handle custom API errors
  if (error instanceof ApiError) {
    const errorResponse: ErrorResponse = {
      error: error.type,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: error.statusCode });
  }

  // Handle validation errors from Zod or other sources
  if (error instanceof Error && error.message.startsWith('VALIDATION_ERROR:')) {
    const errorResponse: ErrorResponse = {
      error: ErrorType.VALIDATION_ERROR,
      message: 'Invalid request data',
      details: error.message.replace('VALIDATION_ERROR: ', ''),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 400 });
  }

  // Handle database errors
  if (error instanceof Error && error.message.includes('duplicate key')) {
    const errorResponse: ErrorResponse = {
      error: ErrorType.CONFLICT_ERROR,
      message: 'Resource already exists',
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(errorResponse, { status: 409 });
  }

  // Handle generic errors
  const errorResponse: ErrorResponse = {
    error: ErrorType.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(errorResponse, { status: 500 });
}

// Async error wrapper for API routes
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, request);
    }
  };
}

// Helper functions for throwing specific errors
export const throwValidationError = (message: string, details?: string): never => {
  throw new ApiError(ErrorType.VALIDATION_ERROR, message, details);
};

export const throwAuthenticationError = (message: string = 'Authentication required'): never => {
  throw new ApiError(ErrorType.AUTHENTICATION_ERROR, message);
};

export const throwAuthorizationError = (message: string = 'Access denied'): never => {
  throw new ApiError(ErrorType.AUTHORIZATION_ERROR, message);
};

export const throwNotFoundError = (resource: string = 'Resource'): never => {
  throw new ApiError(ErrorType.NOT_FOUND_ERROR, `${resource} not found`);
};

export const throwConflictError = (message: string): never => {
  throw new ApiError(ErrorType.CONFLICT_ERROR, message);
};

export const throwInternalServerError = (message: string = 'Internal server error'): never => {
  throw new ApiError(ErrorType.INTERNAL_SERVER_ERROR, message);
};

export const throwExternalServiceError = (service: string, details?: string): never => {
  throw new ApiError(
    ErrorType.EXTERNAL_SERVICE_ERROR,
    `External service error: ${service}`,
    details
  );
};

export const throwTimeoutError = (message: string = 'Request timeout'): never => {
  throw new ApiError(ErrorType.TIMEOUT_ERROR, message);
};

export const throwAIServiceError = (message: string = 'AI service unavailable'): never => {
  throw new ApiError(ErrorType.AI_SERVICE_ERROR, message);
};

export const throwGenerationNotFoundError = (): never => {
  throw new ApiError(ErrorType.NOT_FOUND_ERROR, 'Generation record not found');
};

export const throwUnauthorizedGenerationAccessError = (): never => {
  throw new ApiError(
    ErrorType.AUTHORIZATION_ERROR,
    'You do not have permission to access this generation record'
  );
};
