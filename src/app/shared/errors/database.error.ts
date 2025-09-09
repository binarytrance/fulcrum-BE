import { StatusCodes } from "http-status-codes";
import { BaseError } from "./base.error";

export class DatabaseError extends BaseError {
  constructor(
    message: string = 'Database error',
    details?: unknown,
    statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    isOperational: boolean = true,
  ) {
    super({ message, statusCode, isOperational, details });
  }
}