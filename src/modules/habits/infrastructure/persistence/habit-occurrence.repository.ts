import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { IHabitOccurrenceRepository } from '@habits/domain/ports/habit-occurrence-repo.port';
import {
  HabitOccurrence as HabitOccurrenceEntity,
  type HabitOccurrenceFields,
} from '@habits/domain/entities/habit-occurrence.entity';
import { HabitOccurrence as HabitOccurrenceDoc } from '@habits/infrastructure/persistence/habit-occurrence.schema';
import { OccurrenceStatus } from '@habits/domain/types/habit.types';

interface OccurrenceLean {
  _id: string;
  habitId: { toString(): string };
  userId: { toString(): string };
  date: string;
  status: OccurrenceStatus;
  completedAt: Date | null;
  sessionId: string | null;
  durationMinutes: number | null;
  note: string | null;
  createdAt: Date;
}

function toDomain(doc: OccurrenceLean): HabitOccurrenceEntity {
  return new HabitOccurrenceEntity({
    id: doc._id,
    habitId: doc.habitId.toString(),
    userId: doc.userId.toString(),
    date: doc.date,
    status: doc.status,
    completedAt: doc.completedAt,
    sessionId: doc.sessionId,
    durationMinutes: doc.durationMinutes,
    note: doc.note,
    createdAt: doc.createdAt,
  });
}

function toPersistence(occ: HabitOccurrenceEntity): Record<string, unknown> {
  return {
    _id: occ.id,
    habitId: occ.habitId,
    userId: occ.userId,
    date: occ.date,
    status: occ.status,
    completedAt: occ.completedAt,
    sessionId: occ.sessionId,
    durationMinutes: occ.durationMinutes,
    note: occ.note,
  };
}

@Injectable()
export class HabitOccurrenceRepository implements IHabitOccurrenceRepository {
  constructor(
    @InjectModel('HabitOccurrence')
    private readonly model: Model<HabitOccurrenceDoc>,
  ) {}

  async create(occ: HabitOccurrenceEntity): Promise<HabitOccurrenceEntity> {
    const doc = await this.model.create(toPersistence(occ));
    return toDomain(doc.toObject() as OccurrenceLean);
  }

  async createMany(fields: HabitOccurrenceFields[]): Promise<void> {
    if (!fields.length) return;
    const docs = fields.map((f) => ({
      _id: f.id,
      habitId: f.habitId,
      userId: f.userId,
      date: f.date,
      status: f.status,
      completedAt: f.completedAt,
      sessionId: f.sessionId,
      durationMinutes: f.durationMinutes,
      note: f.note,
    }));
    await this.model.insertMany(docs, { ordered: false });
  }

  async findById(id: string): Promise<HabitOccurrenceEntity | null> {
    const doc = await this.model.findById(id).lean<OccurrenceLean>().exec();
    return doc ? toDomain(doc) : null;
  }

  async findByHabit(habitId: string): Promise<HabitOccurrenceEntity[]> {
    const docs = await this.model
      .find({ habitId })
      .sort({ date: -1 })
      .lean<OccurrenceLean[]>()
      .exec();
    return docs.map(toDomain);
  }

  async findByHabitAndDate(
    habitId: string,
    date: string,
  ): Promise<HabitOccurrenceEntity | null> {
    const doc = await this.model
      .findOne({ habitId, date })
      .lean<OccurrenceLean>()
      .exec();
    return doc ? toDomain(doc) : null;
  }

  async findDueToday(
    userId: string,
    date: string,
  ): Promise<HabitOccurrenceEntity[]> {
    const docs = await this.model
      .find({ userId, date, status: OccurrenceStatus.PENDING })
      .lean<OccurrenceLean[]>()
      .exec();
    return docs.map(toDomain);
  }

  async findInDateRange(
    habitId: string,
    from: string,
    to: string,
  ): Promise<HabitOccurrenceEntity[]> {
    const docs = await this.model
      .find({ habitId, date: { $gte: from, $lte: to } })
      .sort({ date: 1 })
      .lean<OccurrenceLean[]>()
      .exec();
    return docs.map(toDomain);
  }

  async findPendingBefore(date: string): Promise<HabitOccurrenceEntity[]> {
    const docs = await this.model
      .find({ status: OccurrenceStatus.PENDING, date: { $lt: date } })
      .lean<OccurrenceLean[]>()
      .exec();
    return docs.map(toDomain);
  }

  async save(occ: HabitOccurrenceEntity): Promise<HabitOccurrenceEntity> {
    const doc = await this.model
      .findByIdAndUpdate(
        occ.id,
        { $set: toPersistence(occ) },
        { new: true, lean: true },
      )
      .exec();
    return toDomain(doc as OccurrenceLean);
  }
}
