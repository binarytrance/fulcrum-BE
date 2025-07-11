import express, { Router } from 'express';
import { GoalsController } from '~/app/controllers/v1';
import { authHandler, validationHandler } from '~/app/middleware';
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
      authHandler,
      validationHandler({ params: goalsParamsSchema }),
      this.goalsController.getGoals,
    );
  }
}
