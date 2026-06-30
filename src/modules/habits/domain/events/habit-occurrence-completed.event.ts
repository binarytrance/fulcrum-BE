export interface HabitOccurrenceCompletedEvent {
  habitId: string;
  occurrenceId: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  duration: number;
  sessionId: string | null;
}
