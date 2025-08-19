import { Router } from 'express';
import { injectable, inject } from 'tsyringe';
import { GoalsController } from '~/app/controllers';
import { Tokens } from '~/app/core/di';

@injectable()
export class GoalsRouter {
  constructor(
    private readonly goalsController: GoalsController,
    @inject(Tokens.GOALS_ROUTER) private readonly goalsRouter: Router
  ) {}

  public mount(): Router {
    this.goalsRouter.get('/', this.goalsController.getGoals);
    this.goalsRouter.post('/', this.goalsController.postGoal);

    return this.goalsRouter;
  }
}
