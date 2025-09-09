import { StatusCodes } from "http-status-codes";
import { BaseError } from "./base.error";

export class RequestValidationError extends BaseError {
  constructor(
    message: string = 'Request validation failed',
    details?: unknown,
    statusCode: number = StatusCodes.UNPROCESSABLE_ENTITY,
    isOperational: boolean = true,
  ) {
    super({ message, statusCode, isOperational, details });
  }
}
