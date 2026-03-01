import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { IHabitEventPublisher } from '@habits/domain/ports/habit-event-publisher.port';
import type { HabitOccurrenceCompletedEvent } from '@habits/domain/events/habit-occurrence-completed.event';
import {
  HabitJobName,
  type HabitJobPayloads,
} from '@habits/domain/types/habit-jobs.types';

export const HABITS_QUEUE_NAME = 'habits';

@Injectable()
export class HabitEventPublisher implements IHabitEventPublisher {
  constructor(@InjectQueue(HABITS_QUEUE_NAME) private readonly queue: Queue) {}

  async publishOccurrenceCompleted(
    event: HabitOccurrenceCompletedEvent,
  ): Promise<void> {
    const payload: HabitJobPayloads[HabitJobName.UPDATE_STREAK] = {
      habitId: event.habitId,
      userId: event.userId,
      date: event.date,
    };
    await this.queue.add(HabitJobName.UPDATE_STREAK, payload, {
      // Deduplicate: one streak-update per habit per day
      jobId: `${HabitJobName.UPDATE_STREAK}_${event.habitId}_${event.date}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
