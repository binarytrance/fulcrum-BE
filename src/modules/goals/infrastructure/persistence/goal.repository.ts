import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Goal as MongooseGoal,
  GoalDocument,
} from '@goals/infrastructure/persistence/goal.schema';
import { Goal } from '@goals/domain/entities/goal.entity';
import {
  type GoalFilter,
  type IGoalRepository,
} from '@goals/domain/ports/goal-repo.port';
import {
  GoalCategory,
  GoalPriority,
  GoalProgress,
  GoalStatus,
} from '@goals/domain/types/goal.types';

type GoalDocLean = {
  _id: { toString(): string };
  userId: { toString(): string };
  parentGoalId?: { toString(): string } | null;
  title: string;
  description?: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: GoalPriority;
  deadline?: Date | null;
  estimatedHours?: number | null;
  level: 1 | 2 | 3;
  progress: GoalProgress;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class GoalRepository implements IGoalRepository {
  constructor(
    @InjectModel(MongooseGoal.name)
    private readonly goalModel: Model<GoalDocument>,
  ) {}

  async create(goal: Goal): Promise<void> {
    await this.goalModel.create([this.toPersistence(goal)]);
  }

  async findById(id: string): Promise<Goal | null> {
    const doc = await this.goalModel
      .findOne({ _id: id, deletedAt: null })
      .lean<GoalDocLean>();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  /** All non-deleted goals for a user — used to build the in-memory tree */
  async findAllByUserId(userId: string): Promise<Goal[]> {
    const docs = await this.goalModel
      .find({ userId, deletedAt: null })
      .sort({ level: 1, createdAt: 1 })
      .lean<GoalDocLean[]>();
    return docs.map((d) => this.toDomain(d));
  }

  async findByUserId(userId: string, filter?: GoalFilter): Promise<Goal[]> {
    const query: Record<string, unknown> = { userId, deletedAt: null };
    if (filter?.status) query.status = filter.status;
    if (filter?.category) query.category = filter.category;
    const docs = await this.goalModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean<GoalDocLean[]>();
    return docs.map((d) => this.toDomain(d));
  }

  async update(goal: Goal): Promise<void> {
    await this.goalModel.updateOne(
      { _id: goal.id },
      { $set: this.toPersistence(goal) },
    );
  }

  async softDeleteWithDescendants(id: string): Promise<void> {
    const now = new Date();
    // Iteratively collect all descendants
    const idsToDelete: string[] = [id];
    const queue: string[] = [id];

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.goalModel
        .find({ parentGoalId: parentId, deletedAt: null }, { _id: 1 })
        .lean<{ _id: { toString(): string } }[]>();
      for (const child of children) {
        const childId = child._id.toString();
        idsToDelete.push(childId);
        queue.push(childId);
      }
    }

    await this.goalModel.updateMany(
      { _id: { $in: idsToDelete } },
      { $set: { deletedAt: now, updatedAt: now } },
    );
  }

  private toPersistence(goal: Goal) {
    return {
      userId: goal.userId,
      parentGoalId: goal.parentGoalId ?? null,
      title: goal.title,
      description: goal.description ?? null,
      category: goal.category,
      status: goal.status,
      priority: goal.priority,
      deadline: goal.deadline ?? null,
      estimatedHours: goal.estimatedHours ?? null,
      level: goal.level,
      progress: goal.progress,
      deletedAt: goal.deletedAt ?? null,
    };
  }

  private toDomain(doc: GoalDocLean): Goal {
    return new Goal({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      parentGoalId: doc.parentGoalId ? doc.parentGoalId.toString() : null,
      title: doc.title,
      description: doc.description ?? null,
      category: doc.category,
      status: doc.status,
      priority: doc.priority,
      deadline: doc.deadline ?? null,
      estimatedHours: doc.estimatedHours ?? null,
      level: doc.level,
      progress: doc.progress,
      deletedAt: doc.deletedAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
