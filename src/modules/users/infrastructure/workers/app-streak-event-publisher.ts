import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { IAppStreakEventPublisher } from '@users/domain/ports/app-streak-event-publisher.port';
import {
  USERS_QUEUE_NAME,
  UserJobName,
} from '@users/domain/types/user-jobs.types';

@Injectable()
export class AppStreakEventPublisher implements IAppStreakEventPublisher {
  constructor(
    @InjectQueue(USERS_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  async publishActivityRecorded(userId: string, date: string): Promise<void> {
    await this.queue.add(
      UserJobName.UPDATE_APP_STREAK,
      { userId, date },
      { jobId: `streak:${userId}:${date}`, removeOnComplete: true },
    );
  }
}
