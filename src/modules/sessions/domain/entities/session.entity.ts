import { BadRequestException } from '@nestjs/common';
import {
  PlantStatus,
  SessionSource,
  SessionStatus,
  WILTED_DISTRACTION_COUNT,
  WILTED_DISTRACTION_MS,
  WILTING_DISTRACTION_COUNT,
  WILTING_DISTRACTION_MS,
} from '@sessions/domain/types/session.types';

export interface Distraction {
  reason: string;
  estimatedMs: number;
  loggedAt: Date;
}

export interface SessionFields {
  id: string;
  userId: string;
  taskId: string;
  status: SessionStatus;
  source: SessionSource;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number | null;
  netFocusMs: number | null;
  distractions: Distraction[];
  plantStatus: PlantStatus;
  plantGrowthPercent: number;
  createdAt: Date;
}

export class Session {
  readonly id: string;
  readonly userId: string;
  readonly taskId: string;
  readonly status: SessionStatus;
  readonly source: SessionSource;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly durationMs: number | null;
  readonly netFocusMs: number | null;
  readonly distractions: Distraction[];
  readonly plantStatus: PlantStatus;
  readonly plantGrowthPercent: number;
  readonly createdAt: Date;

  constructor(fields: SessionFields) {
    this.id = fields.id;
    this.userId = fields.userId;
    this.taskId = fields.taskId;
    this.status = fields.status;
    this.source = fields.source;
    this.startedAt = fields.startedAt;
    this.endedAt = fields.endedAt;
    this.durationMs = fields.durationMs;
    this.netFocusMs = fields.netFocusMs;
    this.distractions = fields.distractions;
    this.plantStatus = fields.plantStatus;
    this.plantGrowthPercent = fields.plantGrowthPercent;
    this.createdAt = fields.createdAt;
  }

  /** Returns a new Session with the distraction appended (immutable update). */
  addDistraction(distraction: Omit<Distraction, 'loggedAt'>): Session {
    if (this.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot add distraction to a non-active session.',
      );
    }
    const newDistractions: Distraction[] = [
      ...this.distractions,
      { ...distraction, loggedAt: new Date() },
    ];
    return new Session({
      ...this.toFields(),
      distractions: newDistractions,
      plantStatus: computePlantStatus(newDistractions),
    });
  }

  /**
   * Returns a new completed Session with all metrics computed.
   * @param durationMs  Elapsed timer milliseconds (from Redis).
   * @param taskEstimatedDurationMs  Used to calculate plantGrowthPercent.
   * @param previousNetFocusMs  Sum of netFocusMs from all prior COMPLETED sessions for this task.
   */
  complete(
    durationMs: number,
    taskEstimatedDurationMs: number,
    previousNetFocusMs: number = 0,
  ): Session {
    if (this.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active.');
    }
    const totalDistractionMs = this.distractions.reduce(
      (sum, d) => sum + d.estimatedMs,
      0,
    );
    const netFocusMs = Math.max(0, durationMs - totalDistractionMs);
    const cumulativeNetFocusMs = previousNetFocusMs + netFocusMs;
    const plantGrowthPercent =
      taskEstimatedDurationMs > 0
        ? Math.min(
            100,
            Math.round((cumulativeNetFocusMs / taskEstimatedDurationMs) * 100),
          )
        : 0;

    return new Session({
      ...this.toFields(),
      status: SessionStatus.COMPLETED,
      endedAt: new Date(),
      durationMs,
      netFocusMs,
      plantGrowthPercent,
      plantStatus: computePlantStatus(this.distractions),
    });
  }

  /** Returns a new abandoned Session. */
  abandon(): Session {
    return new Session({
      ...this.toFields(),
      status: SessionStatus.ABANDONED,
      endedAt: new Date(),
    });
  }

  private toFields(): SessionFields {
    return {
      id: this.id,
      userId: this.userId,
      taskId: this.taskId,
      status: this.status,
      source: this.source,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      durationMs: this.durationMs,
      netFocusMs: this.netFocusMs,
      distractions: this.distractions,
      plantStatus: this.plantStatus,
      plantGrowthPercent: this.plantGrowthPercent,
      createdAt: this.createdAt,
    };
  }
}

function computePlantStatus(distractions: Distraction[]): PlantStatus {
  const count = distractions.length;
  const totalMs = distractions.reduce((s, d) => s + d.estimatedMs, 0);

  if (count >= WILTED_DISTRACTION_COUNT || totalMs >= WILTED_DISTRACTION_MS) {
    return PlantStatus.WILTED;
  }
  if (count >= WILTING_DISTRACTION_COUNT || totalMs >= WILTING_DISTRACTION_MS) {
    return PlantStatus.WILTING;
  }
  return PlantStatus.HEALTHY;
}
