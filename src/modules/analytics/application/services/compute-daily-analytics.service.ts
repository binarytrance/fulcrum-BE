import { Injectable } from '@nestjs/common';
import type { TimeLeak } from '@analytics/domain/types/analytics.types';

// ─── Input types (plain data — no Mongoose, no decorators) ───────────────────

export interface SessionData {
  taskId: string;
  duration: number | null;
  netFocus: number | null;
  distractions: { estimated: number }[];
  plantStatus: string;
  startedAt: Date;
  endedAt: Date | null;
}

export interface TaskData {
  _id: string;
  type: string;
  status: string;
  efficiencyScore: number | null;
}

export interface OccurrenceData {
  status: 'pending' | 'completed' | 'missed' | 'skipped';
}

// ─── Output type ─────────────────────────────────────────────────────────────

export interface DailyAnalyticsComputed {
  totalLoggedMinutes: number;
  netFocusMinutes: number;
  deepWorkMinutes: number;
  shallowWorkMinutes: number;
  sessionCount: number;
  totalDistractions: number;
  totalDistractionMinutes: number;
  avgDistractionPerSession: number;
  totalTaskCount: number;
  plannedTaskCount: number;
  unplannedTaskCount: number;
  completedTaskCount: number;
  unplannedPercent: number;
  taskCompletionRate: number;
  totalHabitCount: number;
  completedHabitCount: number;
  skippedHabitCount: number;
  missedHabitCount: number;
  habitCompletionRate: number;
  avgEfficiencyScore: number | null;
  timeLeaks: TimeLeak[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function padTime(n: number): string {
  return String(n).padStart(2, '0');
}

function toHHMM(date: Date): string {
  return `${padTime(date.getUTCHours())}:${padTime(date.getUTCMinutes())}`;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ComputeDailyAnalyticsService {
  /**
   * Pure calculation — no I/O. Receives pre-fetched lean data arrays and
   * returns the computed analytics fields ready to be persisted by the caller.
   */
  compute(
    sessions: SessionData[],
    tasks: TaskData[],
    occurrences: OccurrenceData[],
  ): DailyAnalyticsComputed {
    // ── Session metrics ───────────────────────────────────────────────────────
    const sessionCount = sessions.length;

    const totalLoggedMinutes = sessions.reduce(
      (s, sess) => s + Math.round((sess.duration ?? 0) / 60_000),
      0,
    );
    const netFocusMinutes = sessions.reduce(
      (s, sess) => s + Math.round((sess.netFocus ?? 0) / 60_000),
      0,
    );
    const deepWorkMinutes = sessions
      .filter((sess) => sess.plantStatus === 'HEALTHY')
      .reduce((s, sess) => s + Math.round((sess.duration ?? 0) / 60_000), 0);
    const shallowWorkMinutes = totalLoggedMinutes - deepWorkMinutes;

    const allDistractions = sessions.flatMap((sess) => sess.distractions ?? []);
    const totalDistractions = allDistractions.length;
    const totalDistractionMinutes = allDistractions.reduce(
      (s, d) => s + Math.round((d.estimated ?? 0) / 60_000),
      0,
    );
    const avgDistractionPerSession =
      sessionCount > 0
        ? Math.round((totalDistractions / sessionCount) * 10) / 10
        : 0;

    // ── Task metrics ─────────────────────────────────────────────────────────
    const totalTaskCount = tasks.length;
    const plannedTaskCount = tasks.filter((t) => t.type === 'PLANNED').length;
    const unplannedTaskCount = tasks.filter(
      (t) => t.type === 'UNPLANNED',
    ).length;
    const completedTaskCount = tasks.filter(
      (t) => t.status === 'COMPLETED',
    ).length;
    const unplannedPercent =
      totalTaskCount > 0
        ? Math.round((unplannedTaskCount / totalTaskCount) * 100)
        : 0;
    const taskCompletionRate =
      totalTaskCount > 0
        ? Math.round((completedTaskCount / totalTaskCount) * 100)
        : 0;

    // ── Habit metrics ─────────────────────────────────────────────────────────
    const totalHabitCount = occurrences.length;
    const completedHabitCount = occurrences.filter(
      (o) => o.status === 'completed',
    ).length;
    const skippedHabitCount = occurrences.filter(
      (o) => o.status === 'skipped',
    ).length;
    const missedHabitCount = occurrences.filter(
      (o) => o.status === 'missed',
    ).length;
    const habitCompletionRate =
      totalHabitCount > 0
        ? Math.round((completedHabitCount / totalHabitCount) * 100)
        : 0;

    // ── Efficiency ────────────────────────────────────────────────────────────
    const tasksWithScore = tasks.filter(
      (t) => t.efficiencyScore !== null && t.efficiencyScore !== undefined,
    );
    const avgEfficiencyScore =
      tasksWithScore.length > 0
        ? Math.round(
            tasksWithScore.reduce((s, t) => s + (t.efficiencyScore ?? 0), 0) /
              tasksWithScore.length,
          )
        : null;

    // ── Time leaks: gaps > 30 min between consecutive sessions ───────────────
    const sortedSessions = [...sessions].sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
    const timeLeaks: TimeLeak[] = [];
    for (let i = 0; i < sortedSessions.length - 1; i++) {
      const currentEndedAt = sortedSessions[i].endedAt;
      if (!currentEndedAt) continue;
      const endedAt = new Date(currentEndedAt);
      const nextStart = new Date(sortedSessions[i + 1].startedAt);
      const gapMinutes = Math.round(
        (nextStart.getTime() - endedAt.getTime()) / 60_000,
      );
      if (gapMinutes > 30) {
        timeLeaks.push({
          startTime: toHHMM(endedAt),
          endTime: toHHMM(nextStart),
          gapMinutes,
        });
      }
    }

    return {
      totalLoggedMinutes,
      netFocusMinutes,
      deepWorkMinutes,
      shallowWorkMinutes,
      sessionCount,
      totalDistractions,
      totalDistractionMinutes,
      avgDistractionPerSession,
      totalTaskCount,
      plannedTaskCount,
      unplannedTaskCount,
      completedTaskCount,
      unplannedPercent,
      taskCompletionRate,
      totalHabitCount,
      completedHabitCount,
      skippedHabitCount,
      missedHabitCount,
      habitCompletionRate,
      avgEfficiencyScore,
      timeLeaks,
    };
  }
}
