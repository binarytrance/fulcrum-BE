import { StatusCodes } from 'http-status-codes';
import { BaseError } from '../base';

export class UnAuthorizedError extends BaseError {
  constructor(
    message: string = 'Unauthorized',
    details?: unknown,
    statusCode: number = StatusCodes.UNAUTHORIZED,
    isOperational: boolean = true
  ) {
    super({ message, statusCode, isOperational, details });
  }
}
