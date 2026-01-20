import winston from 'winston';

// Interfaces
export interface LoggerOptions {
  level?: string;
  service?: string;
}

export interface GraphQLOperation {
  operationName?: string;
  operationType?: string;
  variables?: Record<string, unknown>;
}

export interface GraphQLContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/**
 * Create and configure Winston logger instance
 */
export function createWinstonLogger(options: LoggerOptions = {}): winston.Logger {
  const { level = process.env.LOG_LEVEL || 'info', service = 'quotevote-backend' } = options;
  return winston.createLogger({
    level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: { service },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
  });
}

/**
 * Shared logger instance - exported as singleton
 */
export const logger = createWinstonLogger();

/**
 * Log a general message
 */
export function logMessage(message: string): void {
  logger.info(`Message: ${message}`);
}

/**
 * Log an error
 */
export function logError(error: Error | string | unknown): void {
  if (error instanceof Error) {
    logger.error(`Error: ${error.message}`, { stack: error.stack });
  } else {
    logger.error(`Error: ${String(error)}`);
  }
}

/**
 * Log GraphQL operation details
 */
export function logGraphQLOperation(
  operation: GraphQLOperation,
  context?: GraphQLContext,
  level: string = 'info'
): void {
  const logData: Record<string, unknown> = {
    operationName: operation.operationName,
    operationType: operation.operationType,
  };

  if (context) {
    logData.context = {
      userId: context.userId,
      requestId: context.requestId,
      ip: context.ip,
    };
  }

  if (operation.variables && Object.keys(operation.variables).length > 0) {
    logData.variables = operation.variables;
  }

  logger.log(level, `GraphQL ${operation.operationType || 'operation'}: ${operation.operationName || 'anonymous'}`, logData);
}

/**
 * Log GraphQL errors with context
 */
export function logGraphQLError(
  error: Error,
  operation?: GraphQLOperation,
  context?: GraphQLContext
): void {
  const logData: Record<string, unknown> = {
    error: error.message,
    stack: error.stack,
  };

  if (operation) {
    logData.operation = {
      name: operation.operationName,
      type: operation.operationType,
    };
  }

  if (context) {
    logData.context = {
      userId: context.userId,
      requestId: context.requestId,
      ip: context.ip,
    };
  }

  logger.error('GraphQL Error', logData);
}

/**
 * Log GraphQL context information
 */
export function logGraphQLContext(context: GraphQLContext, message?: string): void {
  logger.info(message || 'GraphQL Context', {
    userId: context.userId,
    requestId: context.requestId,
    ip: context.ip,
    userAgent: context.userAgent,
  });
}
