import { Application } from 'express';

export abstract class AppMiddleware {
  abstract register(app: Application): void;
}
