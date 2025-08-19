import { StatusCodes } from 'http-status-codes';
import { BaseError } from '../base';

export class BadRequestError extends BaseError {
  constructor(
    message: string = 'Bad request',
    details?: unknown,
    statusCode: number = StatusCodes.BAD_REQUEST,
    isOperational: boolean = true
  ) {
    super({ message, statusCode, isOperational, details });
  }
}
