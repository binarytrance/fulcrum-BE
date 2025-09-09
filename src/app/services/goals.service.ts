import { injectable } from 'tsyringe';
import {
  ICreateBodyGoal,
  IEditBodyGoal,
  IGoal,
  IGoalPaginationOptions,
} from '@interfaces';
import { GoalsRepository } from '@repositories';
import { MultiTieredCache } from '@/app/shared/services/cache';
import { Env } from '@shared/config';

@injectable()
export class GoalsService {
  constructor(
    private goalsRepository: GoalsRepository,
    private cache: MultiTieredCache,
    private readonly env: Env
  ) {}

  public async getGoalsByUserId(
    userId: IGoal['userId'],
    paginationOptions: IGoalPaginationOptions
  ) {
    const key = `${this.env.app.NAME}:${this.env.app.NODE_ENV}:goals:v1:${userId}:goals:limit:${paginationOptions.limit}:next:${paginationOptions.next}`;
    const tags = [`goal:list:${userId}`];

    return this.cache.getOrSet(
      key,
      () => this.goalsRepository.findGoalsByUserId(userId, paginationOptions),
      {
        ttlMs: 15 * 60_000,
        tags,
      }
    );
  }

  public async editGoal(
    params: IEditBodyGoal,
    userId: IGoal['userId'],
    goalId: IGoal['id']
  ) {
    const updatedGoal = await this.goalsRepository.updateGoalsByUserId(
      params,
      userId,
      goalId
    );
    this.cache.invalidateTags([`goal:list:${userId}`]);
    return updatedGoal;
  }

  public async createGoal(params: ICreateBodyGoal, userId: IGoal['userId']) {
    const createdGoal = await this.goalsRepository.insertGoalByUserId(
      params,
      userId
    );
    this.cache.invalidateTags([`goal:list:${userId}`]);
    return createdGoal;
  }

  public async deleteGoal(goalId: IGoal['id'], userId: IGoal['userId']) {
    await this.goalsRepository.deleteGoalByUserId(goalId, userId);
    this.cache.invalidateTags([`goal:list:${userId}`]);
  }
}
