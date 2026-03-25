import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { IAnalyticsEventPublisher } from '@analytics/domain/ports/analytics-event-publisher.port';
import { AnalyticsJobName } from '@analytics/domain/types/analytics-jobs.types';

export const ANALYTICS_QUEUE_NAME = 'analytics';

@Injectable()
export class AnalyticsEventPublisher implements IAnalyticsEventPublisher {
  private readonly logger = new Logger('AnalyticsEventPublisher');

  constructor(
    @InjectQueue(ANALYTICS_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  async queueDailyCompute(userId: string, date: string): Promise<void> {
    this.logger.log(
      `Queuing daily analytics compute — userId: ${userId}, date: ${date}`,
    );
    await this.queue.add(
      AnalyticsJobName.COMPUTE_DAILY,
      { userId, date },
      {
        // Deduplicated per user per day — re-triggered on every session/task that day
        jobId: `analytics.daily_${userId}_${date}`,
        removeOnComplete: { count: 30 },
      },
    );
  }

  async queueGoalCompute(userId: string, taskId: string): Promise<void> {
    this.logger.log(
      `Queuing goal analytics compute — userId: ${userId}, taskId: ${taskId}`,
    );
    await this.queue.add(
      AnalyticsJobName.COMPUTE_GOAL,
      { userId, taskId },
      {
        jobId: `analytics.goal_${taskId}`,
        removeOnComplete: { count: 30 },
      },
    );
  }

  async queueEstimationUpdate(userId: string, taskId: string): Promise<void> {
    this.logger.log(
      `Queuing estimation profile update — userId: ${userId}, taskId: ${taskId}`,
    );
    await this.queue.add(
      AnalyticsJobName.UPDATE_ESTIMATION,
      { userId, taskId },
      {
        jobId: `analytics.estimation_${taskId}`,
        removeOnComplete: { count: 30 },
      },
    );
  }
}
