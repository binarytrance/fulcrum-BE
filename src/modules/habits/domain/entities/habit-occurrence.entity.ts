import { BadRequestException } from '@nestjs/common';
import { OccurrenceStatus } from '@habits/domain/types/habit.types';

export interface HabitOccurrenceFields {
  id: string;
  habitId: string;
  userId: string;
  /** YYYY-MM-DD (UTC) */
  date: string;
  status: OccurrenceStatus;
  completedAt: Date | null;
  skippedAt: Date | null;
  sessionId: string | null;
  duration: number | null;
  notes: string | null;
  createdAt: Date;
}

export class HabitOccurrence {
  readonly id: string;
  readonly habitId: string;
  readonly userId: string;
  readonly date: string;
  readonly status: OccurrenceStatus;
  readonly completedAt: Date | null;
  readonly skippedAt: Date | null;
  readonly sessionId: string | null;
  readonly duration: number | null;
  readonly notes: string | null;
  readonly createdAt: Date;

  constructor(fields: HabitOccurrenceFields) {
    this.id = fields.id;
    this.habitId = fields.habitId;
    this.userId = fields.userId;
    this.date = fields.date;
    this.status = fields.status;
    this.completedAt = fields.completedAt;
    this.skippedAt = fields.skippedAt;
    this.sessionId = fields.sessionId;
    this.duration = fields.duration;
    this.notes = fields.notes;
    this.createdAt = fields.createdAt;
  }

  complete(params: {
    duration: number;
    sessionId?: string;
    notes?: string;
  }): HabitOccurrence {
    if (this.status === OccurrenceStatus.COMPLETED) {
      throw new BadRequestException('Occurrence is already completed.');
    }
    if (this.status === OccurrenceStatus.MISSED) {
      throw new BadRequestException('Cannot complete a missed occurrence.');
    }
    return new HabitOccurrence({
      ...this.toFields(),
      status: OccurrenceStatus.COMPLETED,
      completedAt: new Date(),
      duration: params.duration,
      sessionId: params.sessionId ?? null,
      notes: params.notes ?? null,
    });
  }

  miss(): HabitOccurrence {
    if (this.status !== OccurrenceStatus.PENDING) {
      throw new BadRequestException(`Cannot miss a ${this.status} occurrence.`);
    }
    return new HabitOccurrence({
      ...this.toFields(),
      status: OccurrenceStatus.MISSED,
    });
  }

  skip(): HabitOccurrence {
    if (this.status !== OccurrenceStatus.PENDING) {
      throw new BadRequestException(`Cannot skip a ${this.status} occurrence.`);
    }
    return new HabitOccurrence({
      ...this.toFields(),
      status: OccurrenceStatus.SKIPPED,
      skippedAt: new Date(),
    });
  }

  toFields(): HabitOccurrenceFields {
    return {
      id: this.id,
      habitId: this.habitId,
      userId: this.userId,
      date: this.date,
      status: this.status,
      completedAt: this.completedAt,
      skippedAt: this.skippedAt,
      sessionId: this.sessionId,
      duration: this.duration,
      notes: this.notes,
      createdAt: this.createdAt,
    };
  }
}
