export interface LoggerOptions {
    level?: string;
    service?: string;
}

export interface GraphQLOperation {
    operationName?: string;
    operationType?: string;
    variables?: Record<string, unknown>;
}

export interface GraphQLLogContext {
    userId?: string;
    requestId?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: unknown;
}
