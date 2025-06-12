export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  operation?: string;
  model?: string;
  tokensUsed?: number;
  duration?: number;
  error?: any;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  service: string;
}

class Logger {
  private serviceName: string;
  private minLevel: LogLevel;

  constructor(serviceName: string = 'HealthyMealAI') {
    this.serviceName = serviceName;
    this.minLevel = this.getMinLogLevel();
  }

  private getMinLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLevel) {
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatLogEntry(level: LogLevel, message: string, context: LogContext = {}): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        environment: process.env.NODE_ENV || 'development'
      },
      service: this.serviceName
    };
  }

  private output(logEntry: LogEntry): void {
    if (!this.shouldLog(logEntry.level)) return;

    const logString = JSON.stringify(logEntry, null, process.env.NODE_ENV === 'development' ? 2 : 0);
    
    switch (logEntry.level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.INFO:
        console.info(logString);
        break;
      case LogLevel.DEBUG:
      default:
        console.log(logString);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.output(this.formatLogEntry(LogLevel.DEBUG, message, context));
  }

  info(message: string, context?: LogContext): void {
    this.output(this.formatLogEntry(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.output(this.formatLogEntry(LogLevel.WARN, message, context));
  }

  error(message: string, context?: LogContext): void {
    this.output(this.formatLogEntry(LogLevel.ERROR, message, context));
  }

  // Specialized methods for OpenRouter operations
  openRouterRequest(message: string, context: LogContext): void {
    this.info(`[OpenRouter Request] ${message}`, {
      ...context,
      operation: context.operation || 'unknown',
      model: context.model
    });
  }

  openRouterResponse(message: string, context: LogContext): void {
    this.info(`[OpenRouter Response] ${message}`, {
      ...context,
      tokensUsed: context.tokensUsed,
      duration: context.duration
    });
  }

  openRouterError(message: string, context: LogContext): void {
    this.error(`[OpenRouter Error] ${message}`, {
      ...context,
      errorType: context.error?.constructor?.name,
      errorMessage: context.error?.message,
      statusCode: context.error?.response?.status
    });
  }

  recipeGeneration(message: string, context: LogContext): void {
    this.info(`[Recipe Generation] ${message}`, {
      ...context,
      operation: 'recipe_generation'
    });
  }

  userAction(message: string, context: LogContext): void {
    this.info(`[User Action] ${message}`, {
      ...context,
      userId: context.userId
    });
  }

  performance(message: string, context: LogContext): void {
    this.info(`[Performance] ${message}`, {
      ...context,
      duration: context.duration,
      operation: context.operation
    });
  }

  // Method to create child logger with additional context
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.serviceName);
    childLogger.minLevel = this.minLevel;
    
    // Override output method to include additional context
    const originalOutput = childLogger.output.bind(childLogger);
    childLogger.output = (logEntry: LogEntry) => {
      logEntry.context = { ...additionalContext, ...logEntry.context };
      originalOutput(logEntry);
    };
    
    return childLogger;
  }
}

// Create and export default logger instance
export const logger = new Logger();

// Export specialized loggers for different components
export const openRouterLogger = logger.child({ component: 'OpenRouter' });
export const apiLogger = logger.child({ component: 'API' });
export const authLogger = logger.child({ component: 'Auth' });
export const dbLogger = logger.child({ component: 'Database' });

// Performance monitoring utilities
export class PerformanceMonitor {
  private startTime: number;
  private operation: string;
  private context: LogContext;

  constructor(operation: string, context: LogContext = {}) {
    this.operation = operation;
    this.context = context;
    this.startTime = Date.now();
    
    logger.debug(`Starting operation: ${operation}`, {
      ...context,
      operation,
      startTime: this.startTime
    });
  }

  end(additionalContext: LogContext = {}): number {
    const duration = Date.now() - this.startTime;
    
    logger.performance(`Completed operation: ${this.operation}`, {
      ...this.context,
      ...additionalContext,
      operation: this.operation,
      duration,
      endTime: Date.now()
    });
    
    return duration;
  }

  endWithError(error: any, additionalContext: LogContext = {}): number {
    const duration = Date.now() - this.startTime;
    
    logger.error(`Failed operation: ${this.operation}`, {
      ...this.context,
      ...additionalContext,
      operation: this.operation,
      duration,
      error,
      endTime: Date.now()
    });
    
    return duration;
  }
}

// Health check utilities
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

export class HealthChecker {
  private checks: Map<string, () => Promise<HealthCheckResult>> = new Map();

  registerCheck(name: string, checkFn: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, checkFn);
  }

  async runCheck(name: string): Promise<HealthCheckResult> {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return {
        service: name,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check not found'
      };
    }

    try {
      const result = await checkFn();
      logger.debug(`Health check completed: ${name}`, {
        service: name,
        status: result.status,
        responseTime: result.responseTime
      });
      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        service: name,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      logger.warn(`Health check failed: ${name}`, {
        service: name,
        error: result.error
      });
      
      return result;
    }
  }

  async runAllChecks(): Promise<Record<string, HealthCheckResult>> {
    const results: Record<string, HealthCheckResult> = {};
    
    for (const [name] of this.checks) {
      results[name] = await this.runCheck(name);
    }
    
    return results;
  }
}

// Export default health checker instance
export const healthChecker = new HealthChecker();

// Utility function to create request ID for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Utility function to sanitize sensitive data from logs
export function sanitizeLogData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
} 