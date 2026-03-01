import { BadRequestException } from '@nestjs/common';
import { HabitFrequency, HabitStatus } from '@habits/domain/types/habit.types';

export interface HabitFields {
  id: string;
  userId: string;
  goalId: string;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  /** Day indices (0 = Sun … 6 = Sat). Empty means every day (DAILY). */
  daysOfWeek: number[];
  /** Target minutes per occurrence */
  targetDuration: number;
  status: HabitStatus;
  currentStreak: number;
  longestStreak: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Habit {
  readonly id: string;
  readonly userId: string;
  readonly goalId: string;
  readonly title: string;
  readonly description: string | null;
  readonly frequency: HabitFrequency;
  readonly daysOfWeek: number[];
  readonly targetDuration: number;
  readonly status: HabitStatus;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(fields: HabitFields) {
    this.id = fields.id;
    this.userId = fields.userId;
    this.goalId = fields.goalId;
    this.title = fields.title;
    this.description = fields.description;
    this.frequency = fields.frequency;
    this.daysOfWeek = fields.daysOfWeek;
    this.targetDuration = fields.targetDuration;
    this.status = fields.status;
    this.currentStreak = fields.currentStreak;
    this.longestStreak = fields.longestStreak;
    this.deletedAt = fields.deletedAt;
    this.createdAt = fields.createdAt;
    this.updatedAt = fields.updatedAt;
  }

  /** Is this habit scheduled on a given UTC calendar date? */
  isScheduledForDate(date: Date): boolean {
    if (this.status !== HabitStatus.ACTIVE) return false;
    if (this.frequency === HabitFrequency.DAILY) return true;
    return this.daysOfWeek.includes(date.getUTCDay());
  }

  pause(): Habit {
    if (this.status !== HabitStatus.ACTIVE) {
      throw new BadRequestException('Only active habits can be paused.');
    }
    return new Habit({
      ...this.toFields(),
      status: HabitStatus.PAUSED,
      updatedAt: new Date(),
    });
  }

  resume(): Habit {
    if (this.status !== HabitStatus.PAUSED) {
      throw new BadRequestException('Only paused habits can be resumed.');
    }
    return new Habit({
      ...this.toFields(),
      status: HabitStatus.ACTIVE,
      updatedAt: new Date(),
    });
  }

  archive(): Habit {
    if (this.status === HabitStatus.ARCHIVED) {
      throw new BadRequestException('Habit is already archived.');
    }
    return new Habit({
      ...this.toFields(),
      status: HabitStatus.ARCHIVED,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  update(
    fields: Partial<
      Pick<HabitFields, 'title' | 'description' | 'targetDuration'>
    >,
  ): Habit {
    return new Habit({ ...this.toFields(), ...fields, updatedAt: new Date() });
  }

  /** Returns a new Habit with updated streak counters (called after streak recalculation). */
  withStreaks(currentStreak: number, longestStreak: number): Habit {
    return new Habit({
      ...this.toFields(),
      currentStreak,
      longestStreak,
      updatedAt: new Date(),
    });
  }

  toFields(): HabitFields {
    return {
      id: this.id,
      userId: this.userId,
      goalId: this.goalId,
      title: this.title,
      description: this.description,
      frequency: this.frequency,
      daysOfWeek: this.daysOfWeek,
      targetDuration: this.targetDuration,
      status: this.status,
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      deletedAt: this.deletedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
