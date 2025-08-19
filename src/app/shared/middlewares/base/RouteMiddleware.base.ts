import { NextFunction, Request, Response } from 'express';

export abstract class RouteMiddleware {
  abstract handler(req: Request, response: Response, next: NextFunction): void;
}
