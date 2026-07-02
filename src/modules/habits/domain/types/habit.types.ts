export enum HabitFrequency {
  /** Occurs every day */
  DAILY = 'DAILY',
  /** Occurs on specific days of the week; daysOfWeek[] must be non-empty */
  SPECIFIC_DAYS = 'SPECIFIC_DAYS',
}

export enum HabitStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export enum OccurrenceStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  /** Skipped by the user — does NOT break the streak */
  SKIPPED = 'SKIPPED',
}

/**
 * 20% grace window: if logged duration >= targetDuration * 0.8
 * the occurrence counts as completed.
 */
export const COMPLETION_GRACE_PERCENT = 0.8;

/** Days to pre-generate on habit creation (rolling lookahead window). */
export const OCCURRENCE_LOOKAHEAD_DAYS = 30;

/** Redis TTL for the streak cache (24 hours). */
export const STREAK_CACHE_TTL_SECONDS = 60 * 60 * 24;
