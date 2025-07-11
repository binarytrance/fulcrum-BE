import express, { Router } from 'express';
import { UserController } from '~/app/controllers/v1';
import { validationHandler } from '~/app/middleware';
import { loginSchema } from '~/app/schema';

export class UserRoutes {
  public userRouter: Router;
  private userController: UserController;

  constructor() {
    this.userRouter = express.Router();
    this.userController = new UserController();
    this.initGetRoutes();
  }

  private initGetRoutes() {
    this.userRouter.get(
      '/login',
      validationHandler({ body: loginSchema }),
      this.userController.loginHandler,
    );
  }
}
