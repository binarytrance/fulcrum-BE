import { Application, NextFunction, Request, Response } from 'express';

export interface AppMiddleware {
  register(app: Application): void;
}

export interface RouteMiddleware {
  handler(req: Request, response: Response, next: NextFunction): void;
}
