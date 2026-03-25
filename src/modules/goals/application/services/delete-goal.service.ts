import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GOAL_REPO_PORT,
  type IGoalRepository,
} from '@goals/domain/ports/goal-repo.port';
import {
  GOAL_CACHE_PORT,
  type IGoalCachePort,
} from '@goals/domain/ports/goal-cache.port';

@Injectable()
export class DeleteGoalService {
  constructor(
    @Inject(GOAL_REPO_PORT)
    private readonly goalRepo: IGoalRepository,
    @Inject(GOAL_CACHE_PORT)
    private readonly goalCache: IGoalCachePort,
  ) {}

  /**
   * Soft-deletes a goal and all its descendant sub-goals.
   * Documents are never physically removed — deletedAt is set instead.
   */
  async execute(goalId: string, userId: string): Promise<void> {
    const goal = await this.goalRepo.findById(goalId);
    if (!goal) throw new NotFoundException('Goal not found.');
    if (goal.userId !== userId) throw new ForbiddenException('Access denied.');

    await this.goalRepo.softDeleteWithDescendants(goalId);
    await this.goalCache.invalidate(userId);
  }
}
