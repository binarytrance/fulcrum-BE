export interface ErrorOptions {
  message: string;
  statusCode: number;
  details: unknown;
}

export interface BaseErrorOptions extends ErrorOptions {
  isOperational: boolean;
}

export interface SerializedErrorOptions extends ErrorOptions {}

export class BaseError extends Error {
  public message: string;
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(options: BaseErrorOptions) {
    super(options.message);
    this.message = options.message;
    this.statusCode = options.statusCode;
    this.isOperational = options.isOperational;
    this.details = options.details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  serializeError(): SerializedErrorOptions {
    return {
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class BadRequestError extends BaseError {
  constructor(
    message: string = 'Bad request',
    details?: unknown,
    statusCode: number = 400,
    isOperational: boolean = true,
  ) {
    super({ message, statusCode, isOperational, details });
  }
}

export class UnAuthorizedError extends BaseError {
  constructor(
    message: string = 'Unauthorized',
    details?: unknown,
    statusCode: number = 401,
    isOperational: boolean = true,
  ) {
    super({ message, statusCode, isOperational, details });
  }
}

export class NotFoundError extends BaseError {
  constructor(
    message: string = 'Resource not found',
    details?: unknown,
    statusCode: number = 404,
    isOperational: boolean = true,
  ) {
    super({ message, statusCode, isOperational, details });
  }
}

export class RequestValidationError extends BaseError {
  constructor(
    message: string = 'Request validation failed',
    details?: unknown,
    statusCode: number = 422,
    isOperational: boolean = true,
  ) {
    super({ message, statusCode, isOperational, details });
  }
}

export class DatabaseError extends BaseError {
  constructor(
    message: string = 'Database error',
    details?: unknown,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super({ message, statusCode, isOperational, details });
  }
}

export class InternalServerError extends BaseError {
  constructor(
    message: string = 'internal server error',
    details?: unknown,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super({ message, statusCode, isOperational, details });
  }
}
