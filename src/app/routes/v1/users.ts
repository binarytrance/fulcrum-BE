import express, { Router } from 'express';
import { UserController } from '~/app/controllers/v1';
import { middlewares } from '~/app/middleware';
import { loginSchema, logoutSchema } from '~/app/schema';

export class UserRoutes {
  public userRouter: Router;
  private userController: UserController;

  constructor() {
    this.userRouter = express.Router();
    this.userController = new UserController();
    this.initPostRoutes();
  }

  private initPostRoutes() {
    this.loginRoute();
    this.logoutRoute();
  }

  private loginRoute() {
    /**
     * @swagger
     * /api/v1/users/login:
     *   post:
     *     tags:
     *       - user
     *     description: user login
     *     parameters: 
     *       - in: body
     *         name: body
     *         description: user related params
     *         required: true
     *         type: object
     *         properties: 
     *            username: 
     *              type: string
     *              example: Grace
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: successful login
     */
    this.userRouter.post(
      '/login',
      middlewares.validationMiddleware.validate({ body: loginSchema }),
      this.userController.loginHandler,
    );
  }

  private logoutRoute() {
    /**
     * @swagger
     * /api/v1/users/logout:
     *   post:
     *     tags:
     *       - user
     *     description: user login
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: successful logout
     */
    this.userRouter.post(
      '/logout',
      middlewares.validationMiddleware.validate({ body: logoutSchema }),
      this.userController.logoutHandler,
    );
  }
}
