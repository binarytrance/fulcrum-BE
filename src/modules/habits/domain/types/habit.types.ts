export enum HabitFrequency {
  /** Occurs every day */
  DAILY = 'daily',
  /** Occurs on specific days of the week; daysOfWeek[] must be non-empty */
  SPECIFIC_DAYS = 'specific_days',
}

export enum HabitStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
}

export enum OccurrenceStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  MISSED = 'missed',
  /** Skipped by the user — does NOT break the streak */
  SKIPPED = 'skipped',
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
