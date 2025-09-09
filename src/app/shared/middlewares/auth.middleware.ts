import { NextFunction, Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { UnAuthorizedError } from '@shared/errors';
import { RouteMiddleware } from '@interfaces';

@injectable()
export class AuthMiddleware implements RouteMiddleware {
  handler(req: Request, _: Response, next: NextFunction): void {
    if (!req.isAuthenticated()) {
      throw new UnAuthorizedError();
    }

    // user is authenticated
    next();
  }
}
