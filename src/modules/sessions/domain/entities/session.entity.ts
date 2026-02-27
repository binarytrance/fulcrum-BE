import { BadRequestException } from '@nestjs/common';
import {
  PlantStatus,
  SessionSource,
  SessionStatus,
  WILTED_DISTRACTION_COUNT,
  WILTED_DISTRACTION_MINUTES,
  WILTING_DISTRACTION_COUNT,
  WILTING_DISTRACTION_MINUTES,
} from '@sessions/domain/types/session.types';

export interface Distraction {
  reason: string;
  estimatedMinutes: number;
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
  durationMinutes: number | null;
  netFocusMinutes: number | null;
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
  readonly durationMinutes: number | null;
  readonly netFocusMinutes: number | null;
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
    this.durationMinutes = fields.durationMinutes;
    this.netFocusMinutes = fields.netFocusMinutes;
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
   * @param durationMinutes  Elapsed timer minutes (from Redis).
   * @param taskEstimatedDurationMinutes  Used to calculate plantGrowthPercent.
   */
  complete(
    durationMinutes: number,
    taskEstimatedDurationMinutes: number,
  ): Session {
    if (this.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active.');
    }
    const totalDistractionMinutes = this.distractions.reduce(
      (sum, d) => sum + d.estimatedMinutes,
      0,
    );
    const netFocusMinutes = Math.max(
      0,
      durationMinutes - totalDistractionMinutes,
    );
    const plantGrowthPercent =
      taskEstimatedDurationMinutes > 0
        ? Math.min(
            100,
            Math.round((netFocusMinutes / taskEstimatedDurationMinutes) * 100),
          )
        : 0;

    return new Session({
      ...this.toFields(),
      status: SessionStatus.COMPLETED,
      endedAt: new Date(),
      durationMinutes,
      netFocusMinutes,
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
      durationMinutes: this.durationMinutes,
      netFocusMinutes: this.netFocusMinutes,
      distractions: this.distractions,
      plantStatus: this.plantStatus,
      plantGrowthPercent: this.plantGrowthPercent,
      createdAt: this.createdAt,
    };
  }
}

function computePlantStatus(distractions: Distraction[]): PlantStatus {
  const count = distractions.length;
  const totalMinutes = distractions.reduce((s, d) => s + d.estimatedMinutes, 0);

  if (
    count >= WILTED_DISTRACTION_COUNT ||
    totalMinutes >= WILTED_DISTRACTION_MINUTES
  ) {
    return PlantStatus.WILTED;
  }
  if (
    count >= WILTING_DISTRACTION_COUNT ||
    totalMinutes >= WILTING_DISTRACTION_MINUTES
  ) {
    return PlantStatus.WILTING;
  }
  return PlantStatus.HEALTHY;
}
