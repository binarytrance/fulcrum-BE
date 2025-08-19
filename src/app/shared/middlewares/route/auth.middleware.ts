import { NextFunction, Request, Response } from 'express';
import { injectable } from 'tsyringe';
import { UnAuthorizedError } from '../../errors/app/unAuthorized.error';
import { RouteMiddleware } from '../base';

@injectable()
export class AuthMiddleware extends RouteMiddleware {
  handler(req: Request, _: Response, next: NextFunction): void {
    if (!req.session || !req.session?.user?.id) {
      throw new UnAuthorizedError();
    }

    // user is authenticated
    next();
  }
}
