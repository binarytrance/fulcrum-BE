import { StatusCodes } from 'http-status-codes';
import { BaseError } from '../base';

export class InternalServerError extends BaseError {
  constructor(
    message: string = 'internal server error',
    details?: unknown,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true
  ) {
    super({ message, statusCode, isOperational, details });
  }
}
