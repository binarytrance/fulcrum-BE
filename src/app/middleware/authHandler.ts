import { NextFunction, Request, Response } from 'express';
import { UnAuthorizedError } from '../services';

export function authHandler(req: Request, _: Response, next: NextFunction) {
  if (!req.session || !req.session.id) {
    throw new UnAuthorizedError();
  }

  // user is authenticated
  next();
}
