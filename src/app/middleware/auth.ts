import { NextFunction, Request, Response } from 'express';
import { UnAuthorizedError } from '../services';

export class AuthMiddleware {
  constructor() {}

  public authorized(req: Request, _: Response, next: NextFunction) {
    if (!req.session || !req.session?.user?.id) {
      throw new UnAuthorizedError();
    }

    // user is authenticated
    next();
  }
}
