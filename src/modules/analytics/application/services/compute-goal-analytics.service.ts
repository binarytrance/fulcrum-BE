import { Injectable } from '@nestjs/common';

// ─── Input types (plain data — no Mongoose, no decorators) ───────────────────

export interface GoalInput {
  title: string;
  estimatedEndDate: Date | null;
  /** Total estimated work in milliseconds */
  estimatedDuration: number | null;
}

export interface TaskGoalData {
  _id: string;
  status: string;
  efficiencyScore: number | null;
}

export interface SessionGoalData {
  durationMs: number | null;
  startedAt: Date;
}

// ─── Output type ──────────────────────────────────────────────────────────────

export interface GoalAnalyticsComputed {
  goalTitle: string;
  totalLoggedMinutes: number;
  taskCount: number;
  completedTaskCount: number;
  /** 0–100 */
  completionPercent: number;
  /** null if no tasks with an efficiencyScore exist */
  avgEfficiencyScore: number | null;
  /** 0–100 — percentage of the last 12 weeks that had ≥1 logged session */
  consistencyScore: number;
  weeklyAvgMinutes: number;
  /** Linear projection of completion date at current weekly pace; null if insufficient data */
  projectedCompletionDate: Date | null;
  /** null if goal has no deadline */
  isOnTrack: boolean | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the YYYY-MM-DD string of the Monday that starts the ISO week
 * containing `date`.
 */
function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sunday
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ComputeGoalAnalyticsService {
  /**
   * Pure calculation — no I/O.
   *
   * Receives the pre-fetched goal metadata, all non-deleted tasks belonging to
   * the goal, and all completed sessions across those tasks, then returns the
   * computed analytics fields ready to be persisted by the caller.
   */
  compute(
    goal: GoalInput,
    tasks: TaskGoalData[],
    sessions: SessionGoalData[],
  ): GoalAnalyticsComputed {
    // ── Task metrics ──────────────────────────────────────────────────────────

    const taskCount = tasks.length;
    const completedTaskCount = tasks.filter(
      (t) => t.status === 'COMPLETED',
    ).length;
    const completionPercent =
      taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0;

    const tasksWithScore = tasks.filter((t) => t.efficiencyScore != null);
    const avgEfficiencyScore =
      tasksWithScore.length > 0
        ? Math.round(
            tasksWithScore.reduce((s, t) => s + (t.efficiencyScore ?? 0), 0) /
              tasksWithScore.length,
          )
        : null;

    // ── Session metrics ───────────────────────────────────────────────────────

    const totalLoggedMinutes = sessions.reduce(
      (s, sess) => s + Math.round((sess.durationMs ?? 0) / 60_000),
      0,
    );

    // ── Consistency: % of last 12 weeks (84 days) that had ≥1 session ────────

    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setUTCDate(twelveWeeksAgo.getUTCDate() - 84);

    const recentSessions = sessions.filter(
      (s) => new Date(s.startedAt) >= twelveWeeksAgo,
    );

    const activeWeekKeys = new Set(
      recentSessions.map((s) => getWeekStart(new Date(s.startedAt))),
    );

    const consistencyScore = Math.round((activeWeekKeys.size / 12) * 100);

    // ── Weekly average ────────────────────────────────────────────────────────

    // Use at least 1 to avoid division by zero; if there are no active weeks
    // the weeklyAvgMinutes will still reflect the total divided by 1.
    const weeksActive = Math.max(activeWeekKeys.size, 1);
    const weeklyAvgMinutes = Math.round(totalLoggedMinutes / weeksActive);

    // ── Pacing: project completion date at current weekly pace ────────────────

    let projectedCompletionDate: Date | null = null;
    let isOnTrack: boolean | null = null;

    const estimatedMinutes =
      goal.estimatedDuration != null
        ? Math.round(goal.estimatedDuration / 60_000)
        : 0;

    if (estimatedMinutes > 0 && weeklyAvgMinutes > 0) {
      const remaining = Math.max(0, estimatedMinutes - totalLoggedMinutes);
      const weeksNeeded = remaining / weeklyAvgMinutes;

      const projected = new Date();
      projected.setUTCDate(
        projected.getUTCDate() + Math.round(weeksNeeded * 7),
      );
      projectedCompletionDate = projected;

      if (goal.estimatedEndDate) {
        isOnTrack = projected <= new Date(goal.estimatedEndDate);
      }
    }

    return {
      goalTitle: goal.title,
      totalLoggedMinutes,
      taskCount,
      completedTaskCount,
      completionPercent,
      avgEfficiencyScore,
      consistencyScore,
      weeklyAvgMinutes,
      projectedCompletionDate,
      isOnTrack,
    };
  }
}
