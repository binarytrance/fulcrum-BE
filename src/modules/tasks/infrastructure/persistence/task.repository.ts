import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Task as MongooseTask,
  TaskDocument,
} from '@tasks/infrastructure/persistence/task.schema';
import { Task } from '@tasks/domain/entities/task.entity';
import {
  type ITaskRepository,
  type TaskFilter,
  type TaskStats,
  type Pagination,
} from '@tasks/domain/ports/task-repo.port';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@tasks/domain/types/task.types';

/** Escapes special regex characters to prevent ReDoS from user input. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds the $or date clause for scheduledFor / createdAt filtering.
 * dateFrom only      → single calendar day
 * dateFrom + dateTo  → inclusive range [startOfDay(from), endOfDay(to)]
 * dateFrom + null    → open-ended from startOfDay(from) with no upper bound
 */
function buildDateClause(filter: import('@tasks/domain/ports/task-repo.port').TaskFilter): Record<string, unknown> | null {
  if (!filter.dateFrom) return null;

  const fromStart = new Date(filter.dateFrom);
  fromStart.setUTCHours(0, 0, 0, 0);

  const scheduledFor: Record<string, unknown> = { $gte: fromStart };
  const createdAt: Record<string, unknown> = { $gte: fromStart };

  if (filter.dateTo === null) {
    // open-ended — no upper bound
  } else {
    const upperDate = filter.dateTo ?? filter.dateFrom; // undefined → same day
    const toEnd = new Date(upperDate);
    toEnd.setUTCHours(23, 59, 59, 999);
    scheduledFor.$lte = toEnd;
    createdAt.$lte = toEnd;
  }

  return {
    $or: [
      { scheduledFor },
      { scheduledFor: null, createdAt },
    ],
  };
}

type TaskDocLean = {
  _id: { toString(): string };
  userId: { toString(): string };
  goalId?: { toString(): string } | null;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  scheduledFor?: Date | null;
  estimatedEndDate?: Date | null;
  startDate?: Date | null;
  actualEndDate?: Date | null;
  estimatedDuration: number;
  actualDuration?: number | null;
  efficiencyScore?: number | null;
  completedAt?: Date | null;
  deletedAt?: Date | null;
  habitId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class TaskRepository implements ITaskRepository {
  constructor(
    @InjectModel(MongooseTask.name)
    private readonly taskModel: Model<TaskDocument>,
  ) {}

  async create(task: Task): Promise<void> {
    await this.taskModel.create([this.toPersistence(task)]);
  }

  async findById(id: string): Promise<Task | null> {
    const doc = await this.taskModel
      .findOne({ _id: id, deletedAt: null })
      .lean<TaskDocLean>();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  /**
   * Daily planner query — returns all non-deleted tasks for a user
   * whose scheduledFor falls within the given calendar day (UTC).
   */
  async findByDate(userId: string, date: Date): Promise<Task[]> {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    const docs = await this.taskModel
      .find({
        userId,
        deletedAt: null,
        scheduledFor: { $gte: start, $lte: end },
      })
      .sort({ priority: 1, createdAt: 1 })
      .lean<TaskDocLean[]>();

    return docs.map((d) => this.toDomain(d));
  }

  async findByUserId(
    userId: string,
    filter?: TaskFilter,
    pagination?: Pagination,
  ): Promise<Task[]> {
    const query: Record<string, unknown> = { userId, deletedAt: null };
    if (filter?.status) query.status = filter.status;
    if (filter?.type) query.type = filter.type;
    if (filter?.goalId) query.goalId = filter.goalId;
    const dateClause = filter ? buildDateClause(filter) : null;
    if (dateClause) Object.assign(query, dateClause);

    const q = this.taskModel.find(query).sort({ createdAt: -1 });

    if (pagination) {
      const skip = (pagination.page - 1) * pagination.limit;
      q.skip(skip).limit(pagination.limit);
    }

    const docs = await q.lean<TaskDocLean[]>();
    return docs.map((d) => this.toDomain(d));
  }

  async countByUserId(userId: string, filter?: TaskFilter): Promise<number> {
    const query: Record<string, unknown> = { userId, deletedAt: null };
    if (filter?.status) query.status = filter.status;
    if (filter?.type) query.type = filter.type;
    if (filter?.goalId) query.goalId = filter.goalId;
    const dateClause = filter ? buildDateClause(filter) : null;
    if (dateClause) Object.assign(query, dateClause);
    return this.taskModel.countDocuments(query);
  }

  async searchByUserId(
    userId: string,
    q: string,
    pagination: Pagination,
  ): Promise<Task[]> {
    const pattern = new RegExp(escapeRegex(q), 'i');
    const qLower = q.trim().toLowerCase();
    const skip = (pagination.page - 1) * pagination.limit;
    const docs = await this.taskModel.aggregate<TaskDocLean>([
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
    return this.taskModel.countDocuments({
      userId,
      deletedAt: null,
      $or: [{ title: pattern }, { description: pattern }],
    });
  }

  async getStats(userId: string): Promise<TaskStats> {
    type AggResult = {
      total: { n: number }[];
      byStatus: { _id: TaskStatus; count: number }[];
      byType: { _id: TaskType; count: number }[];
    };

    const [result] = await this.taskModel.aggregate<AggResult>([
      { $match: { userId, deletedAt: null } },
      {
        $facet: {
          total: [{ $count: 'n' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byType: [{ $group: { _id: '$type', count: { $sum: 1 } } }],
        },
      },
    ]);

    const total = result?.total[0]?.n ?? 0;

    const byStatus: Record<TaskStatus, number> = {
      [TaskStatus.PENDING]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.CANCELLED]: 0,
    };
    for (const row of result?.byStatus ?? []) {
      byStatus[row._id] = row.count;
    }

    const byType: Record<TaskType, number> = {
      [TaskType.PLANNED]: 0,
      [TaskType.UNPLANNED]: 0,
    };
    for (const row of result?.byType ?? []) {
      byType[row._id] = row.count;
    }

    return { total, byStatus, byType };
  }

  async update(task: Task): Promise<void> {
    await this.taskModel.updateOne(
      { _id: task.id },
      { $set: this.toPersistence(task) },
    );
  }

  async sumDailyDuration(userId: string, date: Date): Promise<number> {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    type SumResult = { total: number }[];
    const [result] = await this.taskModel.aggregate<SumResult[0]>([
      {
        $match: {
          userId,
          deletedAt: null,
          $or: [
            { scheduledFor: { $gte: start, $lte: end } },
            { scheduledFor: null, createdAt: { $gte: start, $lte: end } },
          ],
        },
      },
      { $group: { _id: null, total: { $sum: '$estimatedDuration' } } },
    ]);
    return (result as { total?: number } | undefined)?.total ?? 0;
  }

  async delete(id: string): Promise<void> {
    await this.taskModel.deleteOne({ _id: id });
  }

  private toPersistence(task: Task): Record<string, unknown> {
    return {
      _id: task.id,
      userId: task.userId,
      goalId: task.goalId ?? null,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      scheduledFor: task.scheduledFor,
      estimatedEndDate: task.estimatedEndDate ?? null,
      startDate: task.startDate ?? null,
      actualEndDate: task.actualEndDate ?? null,
      estimatedDuration: task.estimatedDuration,
      actualDuration: task.actualDuration,
      efficiencyScore: task.efficiencyScore,
      completedAt: task.completedAt,
      deletedAt: task.deletedAt,
      habitId: task.habitId ?? null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  private toDomain(doc: TaskDocLean): Task {
    return new Task({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      goalId: doc.goalId ? doc.goalId.toString() : null,
      title: doc.title,
      description: doc.description ?? null,
      status: doc.status,
      priority: doc.priority,
      type: doc.type,
      scheduledFor: doc.scheduledFor ?? null,
      estimatedEndDate: doc.estimatedEndDate ?? null,
      startDate: doc.startDate ?? null,
      actualEndDate: doc.actualEndDate ?? null,
      estimatedDuration: doc.estimatedDuration,
      actualDuration: doc.actualDuration ?? null,
      efficiencyScore: doc.efficiencyScore ?? null,
      completedAt: doc.completedAt ?? null,
      deletedAt: doc.deletedAt ?? null,
      habitId: doc.habitId ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
