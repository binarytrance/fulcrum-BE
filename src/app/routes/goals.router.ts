import { Router } from 'express';
import { injectable, inject } from 'tsyringe';
import { GoalsController } from '@controllers';
import { Tokens } from '@core/di';

@injectable()
export class GoalsRouter {
  constructor(
    private readonly goalsController: GoalsController,
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
    this.goalsRouter.get('/', this.goalsController.getGoals);

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
    this.goalsRouter.post('/', this.goalsController.postGoal);

    return this.goalsRouter;
  }
}
