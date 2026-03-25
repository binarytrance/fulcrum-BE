export interface TimeLeak {
  /** HH:MM — time the previous session ended */
  startTime: string;
  /** HH:MM — time the next session started */
  endTime: string;
  gapMinutes: number;
}

export interface DailyAnalyticsFields {
  id: string;
  userId: string;
  /** ISO date string YYYY-MM-DD */
  date: string;

  // ── Time metrics ──────────────────────────────────────────────────────────
  totalLoggedMinutes: number;
  netFocusMinutes: number;
  deepWorkMinutes: number;
  shallowWorkMinutes: number;

  // ── Session metrics ───────────────────────────────────────────────────────
  sessionCount: number;
  totalDistractions: number;
  totalDistractionMinutes: number;
  /** X distractions per session, rounded to 1 decimal */
  avgDistractionPerSession: number;

  // ── Task metrics ──────────────────────────────────────────────────────────
  totalTaskCount: number;
  plannedTaskCount: number;
  unplannedTaskCount: number;
  completedTaskCount: number;
  /** 0–100 */
  unplannedPercent: number;
  /** 0–100 */
  taskCompletionRate: number;

  // ── Efficiency ────────────────────────────────────────────────────────────
  /** null if no tasks were completed with an actualDuration */
  avgEfficiencyScore: number | null;

  // ── Time leaks ────────────────────────────────────────────────────────────
  timeLeaks: TimeLeak[];

  computedAt: Date;
}

// ── GoalAnalytics ─────────────────────────────────────────────────────────

export interface GoalAnalyticsFields {
  id: string;
  goalId: string;
  userId: string;
  goalTitle: string;

  totalLoggedMinutes: number;
  taskCount: number;
  completedTaskCount: number;
  /** 0–100 */
  completionPercent: number;
  /** null if no tasks completed with actualDuration */
  avgEfficiencyScore: number | null;
  /** 0–100 — percentage of the last 12 weeks that had ≥1 logged session */
  consistencyScore: number;
  weeklyAvgMinutes: number;
  /** Linear projection of when the goal will be finished at current pace */
  projectedCompletionDate: Date | null;
  /** null if goal has no deadline */
  isOnTrack: boolean | null;

  lastComputedAt: Date;
}

// ── WeeklyAnalytics ───────────────────────────────────────────────────────

export interface GoalWeeklyBreakdown {
  goalId: string;
  goalTitle: string;
  minutesLogged: number;
}

export interface WeeklyAnalyticsFields {
  id: string;
  userId: string;
  /** ISO date of the Monday that starts this week (YYYY-MM-DD) */
  weekStart: string;

  totalLoggedMinutes: number;
  netFocusMinutes: number;
  deepWorkMinutes: number;
  totalSessions: number;
  totalCompletedTasks: number;
  avgDailyMinutes: number;

  bestDay: { date: string; minutes: number } | null;
  worstDay: { date: string; minutes: number } | null;
  timeLeaksIdentified: number;

  goalBreakdown: GoalWeeklyBreakdown[];

  computedAt: Date;
}

// ── EstimationProfile ─────────────────────────────────────────────────────

export type EstimationTrend = 'IMPROVING' | 'DECLINING' | 'STABLE';

export interface AccuracyEntry {
  taskId: string;
  date: Date;
  estimated: number;
  actual: number;
  /** = round(estimated / actual * 100) — >100 means finished faster than est. */
  accuracy: number;
}

export interface EstimationProfileFields {
  id: string;
  userId: string;
  /** Last 30 completions, newest first */
  recentAccuracies: AccuracyEntry[];
  /** null if fewer than 2 entries */
  rollingAverage: number | null;
  /**
   * Compares the avg of the newest half to the avg of the oldest half.
   * null if fewer than 6 entries.
   */
  trend: EstimationTrend | null;
  updatedAt: Date;
}
