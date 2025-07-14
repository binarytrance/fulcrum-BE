import express, { Router } from 'express';
import path from 'path';
import { GoalsController } from '~/app/controllers/v1';
import { middlewares } from '~/app/middleware';
import { createGoalSchema } from '~/app/schema';

export class GoalRoutes {
  public goalRouter: Router;
  private goalsController: GoalsController;
  private key: string;

  constructor() {
    this.goalRouter = express.Router();
    this.key = this.constructKey();
    this.goalsController = new GoalsController(this.key);
    this.initGetRoutes();
  }

  private initGetRoutes() {
    this.getGoals();
    this.postGoal();
  }

  private constructKey(): string {
    return path.basename(__filename, path.extname(__filename));
  }

  private getGoals() {
    /**
     * @swagger
     * /api/v1/goals:
     *   get:
     *     tags:
     *       - goals
     *     description: get goals of logedin user
     *     produces:
     *       - application/json
     *     responses:
     *       200:
     *         description: successful login
     */
    this.goalRouter.get(
      '/',
      middlewares.authMiddleware.authorized,
      this.goalsController.getGoals,
    );
  }

  private postGoal() {
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
    this.goalRouter.post(
      '/',
      middlewares.validationMiddleware.validate({ body: createGoalSchema }),
      middlewares.authMiddleware.authorized,
      this.goalsController.postGoal,
    );
  }
}
