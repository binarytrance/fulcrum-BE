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
import { TaskPriority, TaskStatus } from '@tasks/domain/types/task.types';
import { TaskCacheService } from '@tasks/infrastructure/cache/task-cache.service';

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  scheduledFor?: Date | null;
  estimatedDuration?: number;
  status?: TaskStatus;
}

@Injectable()
export class UpdateTaskService {
  constructor(
    @Inject(TASK_REPO_PORT)
    private readonly taskRepo: ITaskRepository,
    private readonly taskCache: TaskCacheService,
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

    // entity.update() enforces the status state machine
    // and blocks direct transition to COMPLETED (use /complete endpoint)
    const updated = task.update(input);
    await this.taskRepo.update(updated);

    // Invalidate both old and new scheduled dates if date changed
    await this.taskCache.invalidate(userId, task.scheduledFor);
    if (scheduledForChanged) {
      await this.taskCache.invalidate(userId, input.scheduledFor ?? null);
    }

    return updated;
  }
}
