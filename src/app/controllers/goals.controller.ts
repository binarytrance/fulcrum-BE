import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { injectable } from 'tsyringe';
import { createGoalSchema } from '@schemas';
import { ICreateGoal } from '@interfaces';
import { Validate } from '@shared/decorators';
import {
  DatabaseError,
  NotFoundError,
  UnAuthorizedError,
} from '@shared/errors';
import { GoalsService } from '@services';

@injectable()
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {
    this.getGoals = this.getGoals.bind(this);
    this.postGoal = this.postGoal.bind(this);
  }

  public async getGoals(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new UnAuthorizedError('Login to fetch goals');
      }

      const goals = await this.goalsService.getGoalsByUserId(userId);

      if (!goals?.length) {
        throw new NotFoundError('No Goals for the user');
      }

      res.success(goals, 'goals found', StatusCodes.OK);
    } catch (err) {
      throw new DatabaseError('error getting goals', { error: err });
    }
  }

  @Validate({ body: createGoalSchema })
  public async postGoal(req: Request<{}, {}, ICreateGoal>, res: Response) {
    try {
      const userId = req.user?.id!;
      const createdGoal = await this.goalsService.createGoal(req.body, userId);

      res.success(createdGoal, 'goal created', 201);
    } catch (err) {
      throw new DatabaseError('error creating post', { error: err });
    }
  }
}
