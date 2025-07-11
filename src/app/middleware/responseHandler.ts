import { NextFunction, Request, Response } from 'express';
import { SerializedErrorOptions } from '~/services';

export const responseHandler = (
  _: Request,
  res: Response,
  next: NextFunction,
) => {
  res.success = <T>(
    data: T,
    message: string = 'success',
    statusCode: number = 200,
  ) => {
    res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };

  res.fail = (
    errors: SerializedErrorOptions,
    message: string = 'error',
    statusCode: number = 400,
  ) => {
    res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  };

  next();
};
