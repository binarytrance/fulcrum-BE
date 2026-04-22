import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ITaskCapacityPort } from '@habits/domain/ports/task-capacity.port';

interface TaskLean {
  estimatedDuration: number;
}

/**
 * Resolves TASK_CAPACITY_PORT for the habits module.
 * Mirrors the sumDailyDuration logic from the task repository:
 * scheduled tasks for the date + unplanned tasks created on that date.
 */
@Injectable()
export class TaskCapacityAdapter implements ITaskCapacityPort {
  constructor(
    @InjectModel('Task') private readonly taskModel: Model<TaskLean>,
  ) {}

  async getCommittedTaskMs(userId: string, date: Date): Promise<number> {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    const result = await this.taskModel.aggregate<{ total: number }>([
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

    return result[0]?.total ?? 0;
  }
}
