import {
  Application,
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from 'express';
import { injectable } from 'tsyringe';
import { StatusCodes } from 'http-status-codes';
import { Logger } from '~/app/shared/config';
import { AppMiddleware } from '../base';
import { BaseError, SerializedErrorOptions } from '~/app/shared/errors/app';

@injectable()
export class GlobalErrorHandlerMiddleware extends AppMiddleware {
  constructor(private logger: Logger) {
    super();
  }

  register(app: Application): void {
    app.use(this.handler);
  }

  private handler: ErrorRequestHandler = (
    err: Error,
    _: Request,
    res: Response,
    _2: NextFunction
  ) => {
    if (err instanceof BaseError) {
      this.logger.error('App Error', { error: err.serializeError() });
      res.fail(err.serializeError(), err.message, err.statusCode);
      return;
    }

    this.logger.error('Unknown error', {
      message: err.message,
      stack: err.stack,
    });
    const customSerializeErr: SerializedErrorOptions = {
      message: 'Internal Server Error',
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      details: null,
    };
    res.fail(customSerializeErr, 'Something went wrong', 500);
  };
}
