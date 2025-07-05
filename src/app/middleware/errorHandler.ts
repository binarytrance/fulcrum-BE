import { ErrorRequestHandler, Request, Response } from 'express';
import { env } from '~/data/env';
import { BaseError, logger } from '~/services';

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  _: Request,
  res: Response,
) => {
  if (err instanceof BaseError) {
    logger.error('App Error', err.serializeError());
    res.status(err.statusCode).json(err.serializeError());
    return;
  }

  logger.error('Unknown error', { message: err.message, stack: err.stack });
  res.status(500).json({
    message: 'Internal server error',
    statusCode: 500,
    ...(env.APP.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
