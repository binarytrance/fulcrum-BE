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
} from '@tasks/domain/ports/task-repo.port';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@tasks/domain/types/task.types';

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
  estimatedDuration: number;
  actualDuration?: number | null;
  efficiencyScore?: number | null;
  completedAt?: Date | null;
  deletedAt?: Date | null;
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

  async findByUserId(userId: string, filter?: TaskFilter): Promise<Task[]> {
    const query: Record<string, unknown> = { userId, deletedAt: null };
    if (filter?.status) query.status = filter.status;
    if (filter?.type) query.type = filter.type;
    if (filter?.goalId) query.goalId = filter.goalId;

    const docs = await this.taskModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean<TaskDocLean[]>();

    return docs.map((d) => this.toDomain(d));
  }

  async update(task: Task): Promise<void> {
    await this.taskModel.updateOne(
      { _id: task.id },
      { $set: this.toPersistence(task) },
    );
  }

  async softDelete(id: string): Promise<void> {
    await this.taskModel.updateOne(
      { _id: id },
      { $set: { deletedAt: new Date(), updatedAt: new Date() } },
    );
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
      estimatedDuration: task.estimatedDuration,
      actualDuration: task.actualDuration,
      efficiencyScore: task.efficiencyScore,
      completedAt: task.completedAt,
      deletedAt: task.deletedAt,
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
      estimatedDuration: doc.estimatedDuration,
      actualDuration: doc.actualDuration ?? null,
      efficiencyScore: doc.efficiencyScore ?? null,
      completedAt: doc.completedAt ?? null,
      deletedAt: doc.deletedAt ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
