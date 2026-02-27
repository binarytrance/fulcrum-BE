import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Session,
  type Distraction,
} from '@sessions/domain/entities/session.entity';
import type { ISessionRepository } from '@sessions/domain/ports/session-repo.port';
import {
  PlantStatus,
  SessionSource,
  SessionStatus,
} from '@sessions/domain/types/session.types';
import {
  SessionDoc,
  type SessionDocument,
} from '@sessions/infrastructure/persistence/session.schema';

type SessionDocLean = {
  _id: string;
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
};

@Injectable()
export class SessionRepository implements ISessionRepository {
  constructor(
    @InjectModel(SessionDoc.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async create(session: Session): Promise<void> {
    await this.sessionModel.create([this.toPersistence(session)]);
  }

  async findById(id: string): Promise<Session | null> {
    const doc = await this.sessionModel.findById(id).lean<SessionDocLean>();
    return doc ? this.toDomain(doc) : null;
  }

  async findActiveByUserId(userId: string): Promise<Session | null> {
    const doc = await this.sessionModel
      .findOne({ userId, status: SessionStatus.ACTIVE })
      .lean<SessionDocLean>();
    return doc ? this.toDomain(doc) : null;
  }

  async update(session: Session): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: session.id },
      { $set: this.toPersistence(session) },
    );
  }

  async findStaleActive(olderThan: Date): Promise<Session[]> {
    const docs = await this.sessionModel
      .find({ status: SessionStatus.ACTIVE, startedAt: { $lt: olderThan } })
      .lean<SessionDocLean[]>();
    return docs.map((d) => this.toDomain(d));
  }

  async findByTaskId(taskId: string): Promise<Session[]> {
    const docs = await this.sessionModel
      .find({ taskId })
      .sort({ startedAt: -1 })
      .lean<SessionDocLean[]>();
    return docs.map((d) => this.toDomain(d));
  }

  private toPersistence(session: Session) {
    return {
      _id: session.id,
      userId: session.userId,
      taskId: session.taskId,
      status: session.status,
      source: session.source,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      durationMinutes: session.durationMinutes,
      netFocusMinutes: session.netFocusMinutes,
      distractions: session.distractions,
      plantStatus: session.plantStatus,
      plantGrowthPercent: session.plantGrowthPercent,
      createdAt: session.createdAt,
    };
  }

  private toDomain(doc: SessionDocLean): Session {
    return new Session({
      id: doc._id,
      userId: doc.userId,
      taskId: doc.taskId,
      status: doc.status,
      source: doc.source,
      startedAt: doc.startedAt,
      endedAt: doc.endedAt ?? null,
      durationMinutes: doc.durationMinutes ?? null,
      netFocusMinutes: doc.netFocusMinutes ?? null,
      distractions: doc.distractions ?? [],
      plantStatus: doc.plantStatus,
      plantGrowthPercent: doc.plantGrowthPercent ?? 0,
      createdAt: doc.createdAt,
    });
  }
}
