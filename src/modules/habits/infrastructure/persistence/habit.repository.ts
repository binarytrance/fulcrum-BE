import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { IHabitRepository } from '@habits/domain/ports/habit-repo.port';
import { Habit as HabitEntity } from '@habits/domain/entities/habit.entity';
import { Habit as HabitDoc } from '@habits/infrastructure/persistence/habit.schema';
import { HabitFrequency, HabitStatus } from '@habits/domain/types/habit.types';

// Narrow lean type returned from Mongoose
interface HabitLean {
  _id: string;
  userId: { toString(): string };
  goalId: { toString(): string };
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  daysOfWeek: number[];
  targetDuration: number;
  status: HabitStatus;
  currentStreak: number;
  longestStreak: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDomain(doc: HabitLean): HabitEntity {
  return new HabitEntity({
    id: doc._id,
    userId: doc.userId.toString(),
    goalId: doc.goalId.toString(),
    title: doc.title,
    description: doc.description,
    frequency: doc.frequency,
    daysOfWeek: doc.daysOfWeek,
    targetDuration: doc.targetDuration,
    status: doc.status,
    currentStreak: doc.currentStreak,
    longestStreak: doc.longestStreak,
    deletedAt: doc.deletedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });
}

function toPersistence(habit: HabitEntity): Record<string, unknown> {
  return {
    _id: habit.id,
    userId: habit.userId,
    goalId: habit.goalId,
    title: habit.title,
    description: habit.description,
    frequency: habit.frequency,
    daysOfWeek: habit.daysOfWeek,
    targetDuration: habit.targetDuration,
    status: habit.status,
    currentStreak: habit.currentStreak,
    longestStreak: habit.longestStreak,
    deletedAt: habit.deletedAt,
  };
}

@Injectable()
export class HabitRepository implements IHabitRepository {
  constructor(@InjectModel('Habit') private readonly model: Model<HabitDoc>) {}

  async create(habit: HabitEntity): Promise<HabitEntity> {
    const doc = await this.model.create(toPersistence(habit));
    return toDomain(doc.toObject() as HabitLean);
  }

  async findById(id: string): Promise<HabitEntity | null> {
    const doc = await this.model.findById(id).lean<HabitLean>().exec();
    return doc ? toDomain(doc) : null;
  }

  async findByUser(userId: string): Promise<HabitEntity[]> {
    const docs = await this.model
      .find({ userId, deletedAt: null })
      .lean<HabitLean[]>()
      .exec();
    return docs.map(toDomain);
  }

  async findByGoal(goalId: string): Promise<HabitEntity[]> {
    const docs = await this.model
      .find({ goalId, deletedAt: null })
      .lean<HabitLean[]>()
      .exec();
    return docs.map(toDomain);
  }

  async findAllActive(): Promise<HabitEntity[]> {
    const docs = await this.model
      .find({ status: HabitStatus.ACTIVE })
      .lean<HabitLean[]>()
      .exec();
    return docs.map(toDomain);
  }

  async save(habit: HabitEntity): Promise<HabitEntity> {
    const doc = await this.model
      .findByIdAndUpdate(
        habit.id,
        { $set: toPersistence(habit) },
        { new: true, lean: true },
      )
      .exec();
    return toDomain(doc as HabitLean);
  }
}
