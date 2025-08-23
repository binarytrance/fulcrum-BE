import { injectable } from 'tsyringe';
import { ICreateGoal, IGoals } from '@interfaces';
import { GoalsRepository } from '@repositories';

@injectable()
export class GoalsService {
  constructor(private goalsRepository: GoalsRepository) {}

  public async getGoalsByUserId(userId: IGoals['userId']) {
    // return await this.cache.getOrSet(cacheKey, async () =>

    // );

    return await this.goalsRepository.getGoalsByUserId(userId);
  }

  public async createGoal(params: ICreateGoal, userId: IGoals['userId']) {
    const createdGoal = await this.goalsRepository.postGoals(params, userId);
    // this.cache.delete(cacheKey);
    return createdGoal;
  }
}
