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
} from '@tasks/domain/ports/task-repo.port';
import { TaskCacheService } from '@tasks/infrastructure/cache/task-cache.service';
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
  /**
   * >100 = faster than estimated, <100 = over-run.
   * null until the task is completed.
   */
  efficiencyScore: number | null;
  completedAt: Date | null;
  goalId: string | null;
}

@Injectable()
export class GetTasksService {
  constructor(
    @Inject(TASK_REPO_PORT)
    private readonly taskRepo: ITaskRepository,
    private readonly taskCache: TaskCacheService,
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
    const summaries = tasks.map((t) => this.toSummary(t));

    await this.taskCache.setDaily(userId, date, summaries);
    return summaries;
  }

  /**
   * General filter query — returns full Task entities.
   * Not cached; used for inbox/backlog views.
   */
  async getByFilter(
    userId: string,
    filter: import('@tasks/domain/ports/task-repo.port').TaskFilter,
  ): Promise<Task[]> {
    return this.taskRepo.findByUserId(userId, filter);
  }

  /** Full task detail — not cached; called infrequently. */
  async getOne(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new NotFoundException('Task not found.');
    if (task.userId !== userId) throw new ForbiddenException('Access denied.');
    return task;
  }

  private toSummary(task: Task): DailyTaskSummary {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      type: task.type,
      scheduledFor: task.scheduledFor,
      estimatedDuration: task.estimatedDuration,
      actualDuration: task.actualDuration,
      efficiencyScore: task.efficiencyScore,
      completedAt: task.completedAt,
      goalId: task.goalId,
    };
  }
}
