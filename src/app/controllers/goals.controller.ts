import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { injectable } from 'tsyringe';
import {
  createGoalBodySchema,
  deleteGoalParamsSchema,
  editGoalBodySchema,
  editGoalParamsSchema,
  getGoalQuerySchema,
} from '@schemas';
import {
  ICreateBodyGoal,
  IDeleteParamsGoal,
  IEditBodyGoal,
  IEditParamsGoal,
  IGetGoalsQueryParams,
  IGoalPaginationOptions,
} from '@interfaces';
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
    this.getGoalsByUserId = this.getGoalsByUserId.bind(this);
    this.postGoalByUserId = this.postGoalByUserId.bind(this);
    this.deleteGoal = this.deleteGoal.bind(this);
    this.updateGoalsByUserId = this.updateGoalsByUserId.bind(this);
  }

  @Validate({ query: getGoalQuerySchema })
  public async getGoalsByUserId(
    req: Request<{}, {}, {}, IGetGoalsQueryParams>,
    res: Response
  ) {
    try {
      const userId = req.user?.id;
      const paginationOptions: IGoalPaginationOptions = {
        limit: req.query.limit,
        next: req.query.next,
      };

      if (!userId) {
        throw new UnAuthorizedError('Login to fetch goals');
      }

      const goals = await this.goalsService.getGoalsByUserId(
        userId,
        paginationOptions
      );

      if (!goals.items.length) {
        throw new NotFoundError('No Goals found for the user');
      }

      res.success(goals, 'goals found', StatusCodes.OK);
    } catch (err) {
      throw err;
    }
  }

  @Validate({ body: createGoalBodySchema })
  public async postGoalByUserId(
    req: Request<{}, {}, ICreateBodyGoal>,
    res: Response
  ) {
    try {
      const userId = req.user?.id!;
      const createdGoal = await this.goalsService.createGoal(req.body, userId);

      res.success(createdGoal, 'goal created', StatusCodes.CREATED);
    } catch (err) {
      throw err;
    }
  }

  @Validate({ body: editGoalBodySchema, params: editGoalParamsSchema })
  public async updateGoalsByUserId(
    req: Request<IEditParamsGoal, {}, IEditBodyGoal>,
    res: Response
  ) {
    try {
      const userId = req.user?.id!;
      const goalParams: IEditBodyGoal = {
        title: req.body.title,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        status: req.body.status,
        description: req.body.description,
      };

      const updatedGoal = await this.goalsService.editGoal(
        goalParams,
        userId,
        req.params.goalId
      );
      res.success(updatedGoal, 'goal updated', StatusCodes.OK);
    } catch (err) {
      throw err;
    }
  }

  @Validate({ params: deleteGoalParamsSchema })
  public async deleteGoal(
    req: Request<IDeleteParamsGoal, {}, {}>,
    res: Response
  ) {
    try {
      const goalId = req.params.goalId;
      const userId = req.user?.id!;

      await this.goalsService.deleteGoal(goalId, userId);
      res.success(null, 'goal deleted', StatusCodes.OK);
    } catch (err) {
      throw err;
    }
  }
}
