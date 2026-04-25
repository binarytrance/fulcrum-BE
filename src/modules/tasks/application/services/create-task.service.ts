import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_EVENT_PUBLISHER_PORT,
  type IAnalyticsEventPublisher,
} from '@analytics/domain/ports/analytics-event-publisher.port';
import { Task } from '@tasks/domain/entities/task.entity';
import {
  TASK_REPO_PORT,
  type ITaskRepository,
} from '@tasks/domain/ports/task-repo.port';
import {
  GOAL_OWNERSHIP_PORT,
  type IGoalOwnershipVerifier,
} from '@tasks/domain/ports/goal-ownership.port';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@tasks/domain/types/task.types';
import {
  TASK_CACHE_PORT,
  type ITaskCachePort,
} from '@tasks/domain/ports/task-cache.port';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import {
  HABIT_CAPACITY_PORT,
  type IHabitCapacityPort,
} from '@tasks/domain/ports/habit-capacity.port';

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  type?: TaskType;
  scheduledFor?: Date;
  /** Planned end date for the task; null = no target date set */
  estimatedEndDate?: Date;
  /** Time-box the user sets upfront, in milliseconds */
  estimatedDuration: number;
  goalId?: string;
}

@Injectable()
export class CreateTaskService {
  constructor(
    @Inject(TASK_REPO_PORT)
    private readonly taskRepo: ITaskRepository,
    @Inject(GOAL_OWNERSHIP_PORT)
    private readonly goalOwnership: IGoalOwnershipVerifier,
    @Inject(ID_GENERATOR_PORT)
    private readonly idGenerator: IIDGenerator,
    @Inject(TASK_CACHE_PORT)
    private readonly taskCache: ITaskCachePort,
    @Inject(HABIT_CAPACITY_PORT)
    private readonly habitCapacity: IHabitCapacityPort,
    @Inject(ANALYTICS_EVENT_PUBLISHER_PORT)
    private readonly analyticsEventPublisher: IAnalyticsEventPublisher,
  ) {}

  async execute(input: CreateTaskInput): Promise<Task> {
    // Validate goal ownership if provided
    if (input.goalId) {
      await this.goalOwnership.verifyOwnership(input.goalId, input.userId);
    }

    if (input.estimatedDuration < 1000) {
      throw new BadRequestException(
        'estimatedDuration must be at least 1000ms (1 second).',
      );
    }

    const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 86 400 000 ms

    if (input.estimatedDuration >= MAX_DURATION_MS) {
      throw new BadRequestException(
        'A single task cannot be 24 hours or more.',
      );
    }

    // For scheduled tasks use scheduledFor; for unplanned tasks check today so
    // ad-hoc work still counts against the day's 24-hour cap.
    const capDay = input.scheduledFor ?? new Date();
    const [dayTotal, habitTotal] = await Promise.all([
      this.taskRepo.sumDailyDuration(input.userId, capDay),
      this.habitCapacity.getPendingHabitMs(input.userId, capDay),
    ]);
    if (dayTotal + habitTotal + input.estimatedDuration > MAX_DURATION_MS) {
      const day = capDay.toISOString().slice(0, 10);
      const hint = input.scheduledFor
        ? 'Please delete or move an existing task for that day first.'
        : 'Today is already full. Consider moving a planned task to another day to free up capacity.';
      throw new BadRequestException(
        `Adding this task would exceed 24 hours of work on ${day}. ${hint}`,
      );
    }

    // Derive type: unplanned if no goalId and no scheduledFor; else planned
    const type =
      input.type ??
      (input.goalId || input.scheduledFor
        ? TaskType.PLANNED
        : TaskType.UNPLANNED);

    const task = Task.create({
      id: this.idGenerator.generate(),
      userId: input.userId,
      goalId: input.goalId ?? null,
      title: input.title,
      description: input.description ?? null,
      status: TaskStatus.PENDING,
      priority: input.priority ?? TaskPriority.MEDIUM,
      type,
      scheduledFor: input.scheduledFor ?? null,
      estimatedEndDate: input.estimatedEndDate ?? null,
      estimatedDuration: input.estimatedDuration,
    });

    await this.taskRepo.create(task);
    // Bust the daily cache for the scheduled date so the planner reflects the new task
    await this.taskCache.invalidate(input.userId, task.scheduledFor);

    // Trigger daily analytics recompute so the dashboard reflects the new task immediately.
    const analyticsDate = task.scheduledFor
      ? task.scheduledFor.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    await this.analyticsEventPublisher.queueDailyCompute(
      input.userId,
      analyticsDate,
    );

    return task;
  }
}
