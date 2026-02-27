import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { ITaskAccessPort } from '@sessions/domain/ports/task-access.port';

type TaskDoc = {
  _id: string;
  userId: Types.ObjectId;
  estimatedDuration: number;
  deletedAt: Date | null;
};

/**
 * Queries the tasks collection directly using minimal projections.
 * Deliberately avoids importing anything from @tasks —
 * this adapter is the only cross-module concern in the sessions infrastructure.
 */
@Injectable()
export class TaskAccessAdapter implements ITaskAccessPort {
  constructor(
    // 'Task' matches the Mongoose model name registered in TaskMongoModule
    @InjectModel('Task')
    private readonly taskModel: Model<TaskDoc>,
  ) {}

  async verifyOwnership(taskId: string, userId: string): Promise<void> {
    const task = await this.taskModel
      .findOne({ _id: taskId, deletedAt: null }, { userId: 1 })
      .lean<{ userId: Types.ObjectId }>();

    if (!task || task.userId.toString() !== userId) {
      throw new NotFoundException('Task not found.');
    }
  }

  async getEstimatedDuration(taskId: string, userId: string): Promise<number> {
    const task = await this.taskModel
      .findOne(
        { _id: taskId, deletedAt: null },
        { userId: 1, estimatedDuration: 1 },
      )
      .lean<{ userId: Types.ObjectId; estimatedDuration: number }>();

    if (!task || task.userId.toString() !== userId) {
      throw new NotFoundException('Task not found.');
    }
    return task.estimatedDuration;
  }

  async updateActualDuration(
    taskId: string,
    durationMinutes: number,
  ): Promise<void> {
    await this.taskModel.updateOne(
      { _id: taskId },
      { $set: { actualDuration: durationMinutes, updatedAt: new Date() } },
    );
  }
}
