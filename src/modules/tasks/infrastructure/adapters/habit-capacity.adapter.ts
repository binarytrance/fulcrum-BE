import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { IHabitCapacityPort } from '@tasks/domain/ports/habit-capacity.port';

interface OccurrenceLean {
  habitId: unknown;
}

interface HabitLean {
  targetDuration: number;
}

/**
 * Resolves HABIT_CAPACITY_PORT for the tasks module.
 * Queries HabitOccurrence and Habit models (registered via HabitMongoModule).
 */
@Injectable()
export class HabitCapacityAdapter implements IHabitCapacityPort {
  constructor(
    @InjectModel('HabitOccurrence')
    private readonly occModel: Model<OccurrenceLean>,
    @InjectModel('Habit')
    private readonly habitModel: Model<HabitLean>,
  ) {}

  async getPendingHabitMs(userId: string, date: Date): Promise<number> {
    const dateStr = date.toISOString().slice(0, 10);

    const occs = await this.occModel
      .find({ userId, date: dateStr, status: 'PENDING' })
      .select({ habitId: 1 })
      .lean<OccurrenceLean[]>();

    if (!occs.length) return 0;

    const habitIds = occs.map((o) => String(o.habitId));
    const habits = await this.habitModel
      .find({ _id: { $in: habitIds }, deletedAt: null })
      .select({ targetDuration: 1 })
      .lean<HabitLean[]>();

    // targetDuration is in minutes; convert to ms
    return habits.reduce((sum, h) => sum + h.targetDuration * 60_000, 0);
  }
}
