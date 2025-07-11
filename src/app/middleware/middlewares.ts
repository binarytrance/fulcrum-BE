import { AuthMiddleware } from './auth';
import { ErrorMiddleware } from './error';
import { ResponseMiddleware } from './response';
import { ValidationMiddleware } from './validation';

class Middlewares {
  private static instance: Middlewares;
  public authMiddleware: AuthMiddleware;
  public errorMiddleware: ErrorMiddleware;
  public validationMiddleware: ValidationMiddleware;
  public responseMiddleware: ResponseMiddleware;

  constructor() {
    this.authMiddleware = new AuthMiddleware();
    this.errorMiddleware = new ErrorMiddleware();
    this.validationMiddleware = new ValidationMiddleware();
    this.responseMiddleware = new ResponseMiddleware();
  }

  public static getInstance() {
    if (!Middlewares.instance) {
      Middlewares.instance = new Middlewares();
    }

    return Middlewares.instance;
  }
}

const middlewares = Middlewares.getInstance();
export { middlewares };
