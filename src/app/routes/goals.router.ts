import { Router } from 'express';
import { injectable, inject } from 'tsyringe';
import { GoalsController } from '@controllers';
import { Tokens } from '@core/di';
import { AuthMiddleware } from '@shared/middlewares';

@injectable()
export class GoalsRouter {
  constructor(
    private readonly goalsController: GoalsController,
    private readonly authMiddleware: AuthMiddleware,
    @inject(Tokens.GOALS_ROUTER) private readonly goalsRouter: Router
  ) {}

  public mount(): Router {
    /**
     * @swagger
     * /api/v1/goals:
     *   get:
     *     tags:
     *       - goals
     *     description: get goals of loggedin user
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: successful login
     */
    this.goalsRouter.get(
      '/',
      this.authMiddleware.handler,
      this.goalsController.getGoalsByUserId
    );

    /**
     * @swagger
     * /api/v1/goals:
     *   post:
     *     tags:
     *       - goals
     *     description: post a goal of logedin user
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: successful login
     */
    this.goalsRouter.post(
      '/',
      this.authMiddleware.handler,
      this.goalsController.postGoalByUserId
    );

    this.goalsRouter.patch(
      '/:goalId',
      this.authMiddleware.handler,
      this.goalsController.updateGoalsByUserId
    );

    this.goalsRouter.delete(
      '/:goalId',
      this.authMiddleware.handler,
      this.goalsController.deleteGoal
    );

    return this.goalsRouter;
  }
}
