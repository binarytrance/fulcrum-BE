export interface HabitOccurrenceCompletedEvent {
  habitId: string;
  occurrenceId: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  durationMinutes: number;
  sessionId: string | null;
}
