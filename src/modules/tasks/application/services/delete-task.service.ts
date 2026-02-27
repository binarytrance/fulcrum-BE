import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TASK_REPO_PORT,
  type ITaskRepository,
} from '@tasks/domain/ports/task-repo.port';
import { TaskCacheService } from '@tasks/infrastructure/cache/task-cache.service';

@Injectable()
export class DeleteTaskService {
  constructor(
    @Inject(TASK_REPO_PORT)
    private readonly taskRepo: ITaskRepository,
    private readonly taskCache: TaskCacheService,
  ) {}

  async execute(taskId: string, userId: string): Promise<void> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new NotFoundException('Task not found.');
    if (task.userId !== userId) throw new ForbiddenException('Access denied.');

    await this.taskRepo.softDelete(taskId);
    await this.taskCache.invalidate(userId, task.scheduledFor);
  }
}
