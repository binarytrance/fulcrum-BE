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
  sessionId: string | null;
  durationMinutes: number | null;
  note: string | null;
  createdAt: Date;
}

export class HabitOccurrence {
  readonly id: string;
  readonly habitId: string;
  readonly userId: string;
  readonly date: string;
  readonly status: OccurrenceStatus;
  readonly completedAt: Date | null;
  readonly sessionId: string | null;
  readonly durationMinutes: number | null;
  readonly note: string | null;
  readonly createdAt: Date;

  constructor(fields: HabitOccurrenceFields) {
    this.id = fields.id;
    this.habitId = fields.habitId;
    this.userId = fields.userId;
    this.date = fields.date;
    this.status = fields.status;
    this.completedAt = fields.completedAt;
    this.sessionId = fields.sessionId;
    this.durationMinutes = fields.durationMinutes;
    this.note = fields.note;
    this.createdAt = fields.createdAt;
  }

  complete(params: {
    durationMinutes: number;
    sessionId?: string;
    note?: string;
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
      durationMinutes: params.durationMinutes,
      sessionId: params.sessionId ?? null,
      note: params.note ?? null,
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
      sessionId: this.sessionId,
      durationMinutes: this.durationMinutes,
      note: this.note,
      createdAt: this.createdAt,
    };
  }
}
