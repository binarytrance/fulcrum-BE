import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { BaseError, logger, SerializedErrorOptions } from '~/services';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _: Request,
  res: Response,
  _2: NextFunction,
) => {
  if (err instanceof BaseError) {
    logger.error('App Error', err.serializeError());
    res.fail(err.serializeError(), err.message, err.statusCode);
    return;
  }

  logger.error('Unknown error', { message: err.message, stack: err.stack });
  const customSerializeErr: SerializedErrorOptions = {
    message: 'Internal Server Error',
    statusCode: 500,
    details: null,
  };
  res.fail(customSerializeErr, 'Something went wrong', 500);
};
