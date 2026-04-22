import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Goal } from '@goals/domain/entities/goal.entity';
import {
  GOAL_REPO_PORT,
  type IGoalRepository,
  type GoalStats,
} from '@goals/domain/ports/goal-repo.port';
import { type GoalFilter } from '@goals/domain/ports/goal-repo.port';
export type { GoalStats };
import {
  GOAL_CACHE_PORT,
  type IGoalCachePort,
} from '@goals/domain/ports/goal-cache.port';
import type { Pagination } from '@tasks/domain/ports/task-repo.port';

export interface PagedGoals {
  items: Goal[];
  total: number;
}

@Injectable()
export class GetGoalsService {
  constructor(
    @Inject(GOAL_REPO_PORT)
    private readonly goalRepo: IGoalRepository,
    @Inject(GOAL_CACHE_PORT)
    private readonly goalCache: IGoalCachePort,
  ) {}

  /**
   * Returns a flat paginated list of all goals (parents and sub-goals) for a user.
   * Results are sorted by createdAt descending.
   */
  async getAll(
    userId: string,
    filter: GoalFilter,
    page: number,
    limit: number,
  ): Promise<PagedGoals> {
    await this.goalRepo.markOverdueAsMissed(userId);
    const [items, total] = await Promise.all([
      this.goalRepo.findByUserId(userId, filter, { page, limit }),
      this.goalRepo.countByUserId(userId, filter),
    ]);
    return { items, total };
  }

  /** Returns a single goal by ID. */
  async getOne(goalId: string, userId: string): Promise<Goal> {
    await this.goalRepo.markOverdueAsMissed(userId);
    const goal = await this.goalRepo.findById(goalId);
    if (!goal) throw new NotFoundException('Goal not found.');
    if (goal.userId !== userId) throw new ForbiddenException('Access denied.');
    return goal;
  }

  /**
   * Returns the direct sub-goals of a given goal (level-2 children only),
   * as a flat paginated list — no nesting.
   */
  async getSubgoals(
    goalId: string,
    userId: string,
    page: number,
    limit: number,
  ): Promise<PagedGoals> {
    await this.goalRepo.markOverdueAsMissed(userId);
    const goal = await this.goalRepo.findById(goalId);
    if (!goal) throw new NotFoundException('Goal not found.');
    if (goal.userId !== userId) throw new ForbiddenException('Access denied.');
    const all = await this.goalRepo.findAllByUserId(userId);
    const subgoals = all.filter((g) => g.parentGoalId === goalId);
    const total = subgoals.length;
    const skip = (page - 1) * limit;
    const items = subgoals.slice(skip, skip + limit);
    return { items, total };
  }

  /**
   * Full-text search over title and description — flat list, paginated.
   * Not cached; used for search UI.
   */
  async search(
    userId: string,
    q: string,
    pagination: Pagination,
  ): Promise<PagedGoals> {
    await this.goalRepo.markOverdueAsMissed(userId);
    const [items, total] = await Promise.all([
      this.goalRepo.searchByUserId(userId, q, pagination),
      this.goalRepo.countSearchByUserId(userId, q),
    ]);
    return { items, total };
  }

  /** Total goal count + per-status breakdown for the user's dashboard. */
  async getStats(userId: string): Promise<GoalStats> {
    return this.goalRepo.getStats(userId);
  }
}
