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
  type GoalStats,
  type IGoalRepository,
} from '@goals/domain/ports/goal-repo.port';
import type { Pagination } from '@tasks/domain/ports/task-repo.port';
import {
  GoalCategory,
  GoalPriority,
  GoalProgress,
  GoalStatus,
} from '@goals/domain/types/goal.types';

/** Escapes special regex characters to prevent ReDoS from user input. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

type GoalDocLean = {
  _id: { toString(): string };
  userId: { toString(): string };
  parentGoalId?: { toString(): string } | null;
  title: string;
  description?: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: GoalPriority;
  estimatedEndDate?: Date | null;
  estimatedDuration?: number | null;
  estimatedStartDate?: Date | null;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
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
    const doc = await this.goalModel.findOne({ _id: id, deletedAt: null }).lean<GoalDocLean>();
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

  async findByUserId(
    userId: string,
    filter?: GoalFilter,
    pagination?: Pagination,
  ): Promise<Goal[]> {
    const query: Record<string, unknown> = { userId, deletedAt: null };
    if (filter?.status) query.status = filter.status;
    if (filter?.category) query.category = filter.category;
    const q = this.goalModel.find(query).sort({ createdAt: -1 });
    if (pagination) {
      const skip = (pagination.page - 1) * pagination.limit;
      q.skip(skip).limit(pagination.limit);
    }
    const docs = await q.lean<GoalDocLean[]>();
    return docs.map((d) => this.toDomain(d));
  }

  async countByUserId(userId: string, filter?: GoalFilter): Promise<number> {
    const query: Record<string, unknown> = { userId, deletedAt: null };
    if (filter?.status) query.status = filter.status;
    if (filter?.category) query.category = filter.category;
    return this.goalModel.countDocuments(query);
  }

  async searchByUserId(
    userId: string,
    q: string,
    pagination: Pagination,
  ): Promise<Goal[]> {
    const pattern = new RegExp(escapeRegex(q), 'i');
    const qLower = q.trim().toLowerCase();
    const skip = (pagination.page - 1) * pagination.limit;
    const docs = await this.goalModel.aggregate<GoalDocLean>([
      {
        $match: {
          userId,
          deletedAt: null,
          $or: [{ title: pattern }, { description: pattern }],
        },
      },
      {
        $addFields: {
          exactMatchRank: {
            $cond: [
              {
                $or: [
                  { $eq: [{ $toLower: '$title' }, qLower] },
                  {
                    $eq: [
                      { $toLower: { $ifNull: ['$description', ''] } },
                      qLower,
                    ],
                  },
                ],
              },
              0,
              1,
            ],
          },
        },
      },
      { $sort: { exactMatchRank: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: pagination.limit },
    ]);
    return docs.map((d) => this.toDomain(d));
  }

  async countSearchByUserId(userId: string, q: string): Promise<number> {
    const pattern = new RegExp(escapeRegex(q), 'i');
    return this.goalModel.countDocuments({
      userId,
      deletedAt: null,
      $or: [{ title: pattern }, { description: pattern }],
    });
  }

  async getStats(userId: string): Promise<GoalStats> {
    type AggResult = {
      total: { n: number }[];
      byStatus: { _id: GoalStatus; count: number }[];
    };

    const [result] = await this.goalModel.aggregate<AggResult>([
      { $match: { userId, deletedAt: null } },
      {
        $facet: {
          total: [{ $count: 'n' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        },
      },
    ]);

    const total = result?.total[0]?.n ?? 0;

    // Seed every known status with 0 so the response shape is always stable.
    const byStatus: Record<GoalStatus, number> = {
      [GoalStatus.ACTIVE]: 0,
      [GoalStatus.COMPLETED]: 0,
      [GoalStatus.PAUSED]: 0,
      [GoalStatus.ABANDONED]: 0,
      [GoalStatus.MISSED]: 0,
    };
    for (const row of result?.byStatus ?? []) {
      byStatus[row._id] = row.count;
    }

    return { total, byStatus };
  }

  async markOverdueAsMissed(userId: string): Promise<number> {
    const result = await this.goalModel.updateMany(
      {
        userId,
        deletedAt: null,
        status: GoalStatus.ACTIVE,
        estimatedEndDate: { $lt: new Date() },
      },
      { $set: { status: GoalStatus.MISSED, updatedAt: new Date() } },
    );
    return result.modifiedCount;
  }

  async update(goal: Goal): Promise<void> {
    await this.goalModel.updateOne(
      { _id: goal.id },
      { $set: this.toPersistence(goal) },
    );
  }

  async deleteWithDescendants(id: string): Promise<void> {
    // Iteratively collect all descendants
    const idsToDelete: string[] = [id];
    const queue: string[] = [id];

    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.goalModel
        .find({ parentGoalId: parentId }, { _id: 1 })
        .lean<{ _id: { toString(): string } }[]>();
      for (const child of children) {
        const childId = child._id.toString();
        idsToDelete.push(childId);
        queue.push(childId);
      }
    }

    await this.goalModel.updateMany(
      { _id: { $in: idsToDelete } },
      { $set: { deletedAt: new Date(), updatedAt: new Date() } },
    );
  }

  private toPersistence(goal: Goal) {
    return {
      _id: goal.id,
      userId: goal.userId,
      parentGoalId: goal.parentGoalId ?? null,
      title: goal.title,
      description: goal.description ?? null,
      category: goal.category,
      status: goal.status,
      priority: goal.priority,
      estimatedEndDate: goal.estimatedEndDate ?? null,
      estimatedDuration: goal.estimatedDuration ?? null,
      estimatedStartDate: goal.estimatedStartDate ?? null,
      actualStartDate: goal.actualStartDate ?? null,
      actualEndDate: goal.actualEndDate ?? null,
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
      estimatedEndDate: doc.estimatedEndDate ?? null,
      estimatedDuration: doc.estimatedDuration ?? null,
      estimatedStartDate: doc.estimatedStartDate ?? null,
      actualStartDate: doc.actualStartDate ?? null,
      actualEndDate: doc.actualEndDate ?? null,
      level: doc.level,
      progress: doc.progress,
      deletedAt: doc.deletedAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
