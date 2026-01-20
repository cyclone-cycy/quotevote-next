export const logger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
};

export const logMessage = jest.fn();
export const logError = jest.fn();
export const logGraphQLOperation = jest.fn();
export const logGraphQLError = jest.fn();
export const logGraphQLContext = jest.fn();
