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
import {
  TASK_EVENT_PUBLISHER_PORT,
  type ITaskEventPublisher,
} from '@tasks/domain/ports/task-event-publisher.port';
import { TaskCompletedEvent } from '@tasks/domain/events/task-completed.event';
import {
  TASK_CACHE_PORT,
  type ITaskCachePort,
} from '@tasks/domain/ports/task-cache.port';

@Injectable()
export class CompleteTaskService {
  constructor(
    @Inject(TASK_REPO_PORT)
    private readonly taskRepo: ITaskRepository,
    @Inject(TASK_EVENT_PUBLISHER_PORT)
    private readonly taskEventPublisher: ITaskEventPublisher,
    @Inject(TASK_CACHE_PORT)
    private readonly taskCache: ITaskCachePort,
  ) {}

  /**
   * Marks a task as completed.
   *
   * @param actualDuration - Duration in minutes. Optional: if omitted, falls back
   *   to estimatedDuration as a placeholder until Phase 4 (Sessions) computes
   *   the real value from the sum of session durations.
   */
  async execute(
    taskId: string,
    userId: string,
    actualDuration?: number,
  ): Promise<Task> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new NotFoundException('Task not found.');
    if (task.userId !== userId) throw new ForbiddenException('Access denied.');

    // Fall back to estimatedDuration until sessions module computes the real value
    const duration = actualDuration ?? task.estimatedDuration;

    const completed = task.complete(duration);
    await this.taskRepo.update(completed);
    await this.taskCache.invalidate(userId, task.scheduledFor);

    // Fire-and-forget: recompute goal progress asynchronously
    await this.taskEventPublisher.publish(
      new TaskCompletedEvent(taskId, userId, task.goalId, task.habitId ?? null),
    );

    return completed;
  }
}
