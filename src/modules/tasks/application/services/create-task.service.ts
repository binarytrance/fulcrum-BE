import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  type?: TaskType;
  scheduledFor?: Date;
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
  ) {}

  async execute(input: CreateTaskInput): Promise<Task> {
    // Validate goal ownership if provided
    if (input.goalId) {
      await this.goalOwnership.verifyOwnership(input.goalId, input.userId);
    }

    if (input.estimatedDuration < 1) {
      throw new BadRequestException(
        'estimatedDuration must be at least 1 minute.',
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
      estimatedDuration: input.estimatedDuration,
    });

    await this.taskRepo.create(task);
    // Bust the daily cache for the scheduled date so the planner reflects the new task
    await this.taskCache.invalidate(input.userId, task.scheduledFor);
    return task;
  }
}
