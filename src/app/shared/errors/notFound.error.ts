import { StatusCodes } from "http-status-codes";
import { BaseError } from "./base.error";

export class NotFoundError extends BaseError {
  constructor(
    message: string = 'Resource not found',
    details?: unknown,
    statusCode: number = StatusCodes.NOT_FOUND,
    isOperational: boolean = true,
  ) {
    super({ message, statusCode, isOperational, details });
  }
}