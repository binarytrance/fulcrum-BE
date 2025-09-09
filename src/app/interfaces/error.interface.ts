export interface ErrorOptions {
  message: string;
  statusCode: number;
  details: unknown;
}

export interface BaseErrorOptions extends ErrorOptions {
  isOperational: boolean;
}

export interface SerializedErrorOptions extends ErrorOptions {}
