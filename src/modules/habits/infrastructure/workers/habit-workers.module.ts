import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Queue } from 'bullmq';
import { SharedModule } from '@shared/shared.module';
import { HabitMongoModule } from '@habits/infrastructure/persistence/habit-mongo.module';
import { HabitWorker } from '@habits/infrastructure/workers/habit.worker';
import {
  HabitEventPublisher,
  HABITS_QUEUE_NAME,
} from '@habits/infrastructure/event-publisher/habit-event-publisher';
import { HabitStreakCache } from '@habits/infrastructure/cache/habit-streak.cache';
import { HABIT_REPO_PORT } from '@habits/domain/ports/habit-repo.port';
import { HABIT_EVENT_PUBLISHER_PORT } from '@habits/domain/ports/habit-event-publisher.port';
import { HABIT_OCCURRENCE_REPO_PORT } from '@habits/domain/ports/habit-occurrence-repo.port';
import { HabitRepository } from '@habits/infrastructure/persistence/habit.repository';
import { HabitOccurrenceRepository } from '@habits/infrastructure/persistence/habit-occurrence.repository';
import { HabitJobName } from '@habits/domain/types/habit-jobs.types';

@Module({
  imports: [
    SharedModule,
    HabitMongoModule,
    BullModule.registerQueue({ name: HABITS_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: HABITS_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    { provide: HABIT_REPO_PORT, useExisting: HabitRepository },
    {
      provide: HABIT_OCCURRENCE_REPO_PORT,
      useExisting: HabitOccurrenceRepository,
    },
    HabitWorker,
    HabitStreakCache,
    HabitEventPublisher,
    { provide: HABIT_EVENT_PUBLISHER_PORT, useExisting: HabitEventPublisher },
  ],
  exports: [BullModule, HABIT_EVENT_PUBLISHER_PORT, HabitStreakCache],
})
export class HabitWorkersModule implements OnModuleInit {
  constructor(@InjectQueue(HABITS_QUEUE_NAME) private readonly queue: Queue) {}

  async onModuleInit(): Promise<void> {
    // Schedule the nightly maintenance job at midnight UTC.
    // obliterate: true + upsert pattern: remove old repeat and re-add to keep it idempotent.
    await this.queue.add(
      HabitJobName.NIGHTLY_MAINTENANCE,
      {},
      {
        repeat: { pattern: '0 0 * * *' }, // 00:00 UTC every day
        jobId: 'habits.nightly-maintenance.cron',
      },
    );
  }
}
