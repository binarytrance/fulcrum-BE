import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  USERS_QUEUE_NAME,
  UserJobName,
  type UserJobPayloads,
} from '@users/domain/types/user-jobs.types';
import { USER_REPO_PORT, type IUserRepository } from '@users/domain/ports/user-rep.port';

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

@Processor(USERS_QUEUE_NAME)
@Injectable()
export class UserWorker extends WorkerHost {
  private readonly logger = new Logger(UserWorker.name);

  constructor(
    @Inject(USER_REPO_PORT) private readonly userRepo: IUserRepository,
  ) {
    super();
  }

  async process(job: Job<UserJobPayloads[UserJobName.UPDATE_APP_STREAK]>): Promise<void> {
    if (job.name === UserJobName.UPDATE_APP_STREAK) {
      await this.handleUpdateAppStreak(job.data.userId, job.data.date);
    }
  }

  private async handleUpdateAppStreak(userId: string, date: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) return;

    const streak = user.appStreak;

    if (streak.lastActiveDate === date) return;

    const yesterday = addDays(date, -1);

    const current =
      streak.lastActiveDate === yesterday
        ? streak.current + 1
        : 1;

    const longest = Math.max(streak.longest, current);
    await this.userRepo.update(user.withStreak(current, longest, date));

    this.logger.log(`[AppStreak] user=${userId} current=${current} longest=${longest}`);
  }

  @OnWorkerEvent('ready')
  onReady() { this.logger.log('User worker connected'); }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(`Job failed: ${job.id} — ${job.name}`, job.failedReason);
  }
}
