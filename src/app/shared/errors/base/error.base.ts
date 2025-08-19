import {
  BaseErrorOptions,
  SerializedErrorOptions,
} from '../interfaces/error.interface';

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
