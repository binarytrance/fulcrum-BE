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
import {
  TASK_CACHE_PORT,
  type ITaskCachePort,
} from '@tasks/domain/ports/task-cache.port';
import {
  ANALYTICS_EVENT_PUBLISHER_PORT,
  type IAnalyticsEventPublisher,
} from '@analytics/domain/ports/analytics-event-publisher.port';

@Injectable()
export class DeleteTaskService {
  constructor(
    @Inject(TASK_REPO_PORT)
    private readonly taskRepo: ITaskRepository,
    @Inject(TASK_CACHE_PORT)
    private readonly taskCache: ITaskCachePort,
    @Inject(ANALYTICS_EVENT_PUBLISHER_PORT)
    private readonly analyticsEventPublisher: IAnalyticsEventPublisher,
  ) {}

  async execute(taskId: string, userId: string): Promise<void> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new NotFoundException('Task not found.');
    if (task.userId !== userId) throw new ForbiddenException('Access denied.');

    const completedDate = task.completedAt?.toISOString().slice(0, 10) ?? null;

    await this.taskRepo.update(task.softDelete());

    const followUps: Promise<void>[] = [
      this.taskCache.invalidate(userId, task.scheduledFor),
    ];

    if (completedDate) {
      followUps.push(
        this.analyticsEventPublisher.queueDailyCompute(userId, completedDate),
      );
    }

    if (task.goalId) {
      followUps.push(
        this.analyticsEventPublisher.queueGoalCompute(userId, task.id),
      );
    }

    await Promise.all(followUps);
  }
}
