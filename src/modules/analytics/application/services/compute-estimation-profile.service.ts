import { Injectable } from '@nestjs/common';

import type {
  AccuracyEntry,
  EstimationTrend,
} from '@analytics/domain/types/analytics.types';

// ─── Input types (plain data — no Mongoose, no decorators) ───────────────────

export interface NewAccuracyInput {
  taskId: string;
  date: Date;
  /** estimatedDuration in ms */
  estimated: number;
  /** actualDuration in ms */
  actual: number;
  /** = round(estimated / actual * 100) */
  accuracy: number;
}

// ─── Output type ─────────────────────────────────────────────────────────────

export interface EstimationProfileComputed {
  /** Newest-first, capped at 30 entries */
  recentAccuracies: AccuracyEntry[];
  /** Rolling average of accuracy scores; null if list is empty */
  rollingAverage: number | null;
  /** IMPROVING / DECLINING / STABLE based on newest-half vs oldest-half avg */
  trend: EstimationTrend;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ComputeEstimationProfileService {
  /**
   * Pure calculation — no I/O.
   *
   * Prepends `newEntry` to the existing accuracy list, caps at 30 entries,
   * then computes the rolling average and trend direction.
   *
   * Trend logic:
   *   - Requires ≥ 6 entries to move away from STABLE.
   *   - Splits the list in half (newest first), compares the two halves' averages.
   *   - diff > +5  → IMPROVING
   *   - diff < −5  → DECLINING
   *   - otherwise  → STABLE
   */
  compute(
    newEntry: NewAccuracyInput,
    existingAccuracies: AccuracyEntry[],
  ): EstimationProfileComputed {
    // 1. Prepend the new entry and cap to 30
    const updated: AccuracyEntry[] = [
      newEntry as AccuracyEntry,
      ...existingAccuracies,
    ].slice(0, 30);

    // 2. Rolling average
    const rollingAverage =
      updated.length > 0
        ? Math.round(
            updated.reduce((sum, e) => sum + e.accuracy, 0) / updated.length,
          )
        : null;

    // 3. Trend
    let trend: EstimationTrend = 'STABLE';
    if (updated.length >= 6) {
      const mid = Math.floor(updated.length / 2);
      const recentHalf = updated.slice(0, mid);
      const olderHalf = updated.slice(mid);

      const avg = (arr: AccuracyEntry[]) =>
        arr.reduce((sum, e) => sum + e.accuracy, 0) / arr.length;

      const diff = avg(recentHalf) - avg(olderHalf);
      trend = diff > 5 ? 'IMPROVING' : diff < -5 ? 'DECLINING' : 'STABLE';
    }

    return { recentAccuracies: updated, rollingAverage, trend };
  }
}
