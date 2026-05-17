import {
  BadRequestException,
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
import { TaskPriority, TaskStatus } from '@tasks/domain/types/task.types';
import {
  TASK_CACHE_PORT,
  type ITaskCachePort,
} from '@tasks/domain/ports/task-cache.port';
import {
  HABIT_CAPACITY_PORT,
  type IHabitCapacityPort,
} from '@tasks/domain/ports/habit-capacity.port';
import {
  TASK_EVENT_PUBLISHER_PORT,
  type ITaskEventPublisher,
} from '@tasks/domain/ports/task-event-publisher.port';
import { TaskCompletedEvent } from '@tasks/domain/events/task-completed.event';
import {
  APP_STREAK_EVENT_PUBLISHER_PORT,
  type IAppStreakEventPublisher,
} from '@users/domain/ports/app-streak-event-publisher.port';

const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  scheduledFor?: Date | null;
  estimatedEndDate?: Date | null;
  startDate?: Date | null;
  estimatedDuration?: number;
  status?: TaskStatus;
  actualDuration?: number;
  completedAt?: Date;
}

@Injectable()
export class UpdateTaskService {
  constructor(
    @Inject(TASK_REPO_PORT)
    private readonly taskRepo: ITaskRepository,
    @Inject(TASK_CACHE_PORT)
    private readonly taskCache: ITaskCachePort,
    @Inject(HABIT_CAPACITY_PORT)
    private readonly habitCapacity: IHabitCapacityPort,
    @Inject(TASK_EVENT_PUBLISHER_PORT)
    private readonly taskEventPublisher: ITaskEventPublisher,
    @Inject(APP_STREAK_EVENT_PUBLISHER_PORT)
    private readonly appStreakPublisher: IAppStreakEventPublisher,
  ) {}

  async execute(
    taskId: string,
    userId: string,
    input: UpdateTaskInput,
  ): Promise<Task> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new NotFoundException('Task not found.');
    if (task.userId !== userId) throw new ForbiddenException('Access denied.');

    const scheduledForChanged =
      input.scheduledFor !== undefined &&
      input.scheduledFor?.getTime() !== task.scheduledFor?.getTime();

    const durationChanged =
      input.estimatedDuration !== undefined &&
      input.estimatedDuration !== task.estimatedDuration;

    // Re-check 24h cap whenever duration or scheduled date changes (skip on completion).
    if ((durationChanged || scheduledForChanged) && input.status !== TaskStatus.COMPLETED) {
      const newDuration = input.estimatedDuration ?? task.estimatedDuration;

      if (newDuration >= MAX_DURATION_MS) {
        throw new BadRequestException(
          'A single task cannot be 24 hours or more.',
        );
      }

      // Use the new scheduled date (if changed) as the cap day; fall back to current.
      const capDay = scheduledForChanged
        ? (input.scheduledFor ?? task.scheduledFor ?? new Date())
        : (task.scheduledFor ?? new Date());

      const [dayTotal, habitTotal] = await Promise.all([
        this.taskRepo.sumDailyDuration(userId, capDay),
        this.habitCapacity.getPendingHabitMs(userId, capDay),
      ]);

      // Subtract the task's current contribution before adding the new values.
      const otherTaskMs = dayTotal - task.estimatedDuration;
      if (otherTaskMs + habitTotal + newDuration > MAX_DURATION_MS) {
        const day = capDay.toISOString().slice(0, 10);
        throw new BadRequestException(
          `Updating this task would exceed 24 hours of work on ${day}. ` +
            'Please reduce the duration or move another task to a different day.',
        );
      }
    }

    if (input.status === TaskStatus.COMPLETED) {
      const duration = input.actualDuration ?? task.actualDuration ?? task.estimatedDuration;
      const completed = task.complete(duration, input.completedAt as Date);
      await this.taskRepo.update(completed);
      await this.taskCache.invalidate(userId, task.scheduledFor);
      await this.taskEventPublisher.publish(
        new TaskCompletedEvent(taskId, userId, task.goalId, task.habitId ?? null),
      );
      await this.appStreakPublisher.publishActivityRecorded(
        userId,
        new Date().toISOString().slice(0, 10),
      );
      return completed;
    }

    const updated = task.update(input);
    await this.taskRepo.update(updated);
    await this.taskCache.invalidate(userId, task.scheduledFor);
    if (scheduledForChanged) {
      await this.taskCache.invalidate(userId, input.scheduledFor ?? null);
    }
    return updated;
  }
}
