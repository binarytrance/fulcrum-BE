import express, { Router } from 'express';
import { GoalsController } from '~/app/controllers/v1';
import { middlewares } from '~/app/middleware';
import { goalsParamsSchema } from '~/app/schema';

export class GoalRoutes {
  public goalRouter: Router;
  private goalsController: GoalsController;

  constructor() {
    this.goalRouter = express.Router();
    this.goalsController = new GoalsController();
    this.initGetRoutes();
  }

  private initGetRoutes() {
    this.goalRouter.get(
      '/:userId',
      middlewares.authMiddleware.authorized,
      middlewares.validationMiddleware.validate({ params: goalsParamsSchema }),
      this.goalsController.getGoals,
    );
  }
}
