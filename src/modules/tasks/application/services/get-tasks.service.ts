import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Task } from '@tasks/domain/entities/task.entity';
import {
  TASK_REPO_PORT,
  type ITaskRepository,
  type TaskFilter,
  type TaskStats,
  type Pagination,
} from '@tasks/domain/ports/task-repo.port';

export type { TaskStats };
import {
  TASK_CACHE_PORT,
  type ITaskCachePort,
} from '@tasks/domain/ports/task-cache.port';
import {
  GOAL_TITLE_PORT,
  type IGoalTitleLookup,
} from '@tasks/domain/ports/goal-title.port';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@tasks/domain/types/task.types';

/**
 * Trimmed shape returned by the daily planner query.
 * Deliberately excludes description and audit timestamps —
 * this endpoint is called constantly and should stay lean.
 */
export interface DailyTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  scheduledFor: Date | null;
  estimatedDuration: number;
  actualDuration: number | null;
  completedAt: Date | null;
  goal: { id: string | null; title: string | null };
  analytics: { efficiencyScore: number | null };
}

export interface PagedTasks {
  items: Task[];
  total: number;
  /** Map of goalId → title for all tasks in the result set. */
  goalTitles: Map<string, string>;
}

@Injectable()
export class GetTasksService {
  constructor(
    @Inject(TASK_REPO_PORT)
    private readonly taskRepo: ITaskRepository,
    @Inject(TASK_CACHE_PORT)
    private readonly taskCache: ITaskCachePort,
    @Inject(GOAL_TITLE_PORT)
    private readonly goalTitleLookup: IGoalTitleLookup,
  ) {}

  /**
   * Daily planner query — the hot path; results are Redis-cached.
   * Returns a trimmed DTO array, not full task entities.
   */
  async getByDate(userId: string, date: Date): Promise<DailyTaskSummary[]> {
    const cached = await this.taskCache.getDaily<DailyTaskSummary[]>(
      userId,
      date,
    );
    if (cached) return cached;

    const tasks = await this.taskRepo.findByDate(userId, date);
    const goalTitles = await this.batchFetchGoalTitles(tasks);
    const summaries = tasks.map((t) => this.toSummary(t, goalTitles));

    await this.taskCache.setDaily(userId, date, summaries);
    return summaries;
  }

  /**
   * General filter query — returns paginated Task entities.
   * Not cached; used for inbox/backlog views.
   */
  async getByFilter(
    userId: string,
    filter: TaskFilter,
    pagination: Pagination,
  ): Promise<PagedTasks> {
    const [items, total] = await Promise.all([
      this.taskRepo.findByUserId(userId, filter, pagination),
      this.taskRepo.countByUserId(userId, filter),
    ]);
    const goalTitles = await this.batchFetchGoalTitles(items);
    return { items, total, goalTitles };
  }

  /** Full task detail — not cached; called infrequently. */
  async getOne(
    taskId: string,
    userId: string,
  ): Promise<{ task: Task; goalTitle: string | null }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new NotFoundException('Task not found.');
    if (task.userId !== userId) throw new ForbiddenException('Access denied.');
    const goalTitle = await this.fetchGoalTitle(task.goalId);
    return { task, goalTitle };
  }

  /**
   * Fetch the title for a single goalId.
   * Returns null for tasks not linked to a goal.
   * Used by write endpoints (create / update / complete) that return a single task.
   */
  async fetchGoalTitle(goalId: string | null): Promise<string | null> {
    if (!goalId) return null;
    const map = await this.goalTitleLookup.fetchTitles([goalId]);
    return map.get(goalId) ?? null;
  }

  /**
   * Full-text search over title and description — flat list, paginated.
   * Not cached; used for search UI.
   */
  async search(
    userId: string,
    q: string,
    pagination: Pagination,
  ): Promise<PagedTasks> {
    const [items, total] = await Promise.all([
      this.taskRepo.searchByUserId(userId, q, pagination),
      this.taskRepo.countSearchByUserId(userId, q),
    ]);
    const goalTitles = await this.batchFetchGoalTitles(items);
    return { items, total, goalTitles };
  }

  /** Total task count + per-status and per-type breakdowns for the user's dashboard. */
  async getStats(userId: string): Promise<TaskStats> {
    return this.taskRepo.getStats(userId);
  }

  private toSummary(
    task: Task,
    goalTitles: Map<string, string>,
  ): DailyTaskSummary {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      type: task.type,
      scheduledFor: task.scheduledFor,
      estimatedDuration: task.estimatedDuration,
      actualDuration: task.actualDuration,
      completedAt: task.completedAt,
      goal: { id: task.goalId, title: task.goalId ? (goalTitles.get(task.goalId) ?? null) : null },
      analytics: { efficiencyScore: task.efficiencyScore },
    };
  }

  private async batchFetchGoalTitles(
    tasks: Task[],
  ): Promise<Map<string, string>> {
    const goalIds = [
      ...new Set(tasks.map((t) => t.goalId).filter(Boolean)),
    ] as string[];
    return this.goalTitleLookup.fetchTitles(goalIds);
  }
}
