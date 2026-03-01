import type { HabitOccurrenceCompletedEvent } from '@habits/domain/events/habit-occurrence-completed.event';

export const HABIT_EVENT_PUBLISHER_PORT = Symbol('HABIT_EVENT_PUBLISHER_PORT');

export interface IHabitEventPublisher {
  publishOccurrenceCompleted(
    event: HabitOccurrenceCompletedEvent,
  ): Promise<void>;
}
