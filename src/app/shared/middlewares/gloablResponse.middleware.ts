import { Application, NextFunction, Request, Response } from 'express';
import { SerializedErrorOptions, AppMiddleware } from '@interfaces';

export class GlobalResponseHandlerMiddleware implements AppMiddleware {
  public register(app: Application): void {
    app.use(this.sendFormattedResponse);
  }

  private sendFormattedResponse = (
    _: Request,
    res: Response,
    next: NextFunction
  ) => {
    res.success = <T>(data: T, message: string, statusCode: number) => {
      res.status(statusCode).json({
        success: true,
        message,
        data,
      });
    };

    res.fail = (
      errors: SerializedErrorOptions,
      message: string,
      statusCode: number
    ) => {
      res.status(statusCode).json({
        success: false,
        message,
        errors,
      });
    };

    next();
  };
}
