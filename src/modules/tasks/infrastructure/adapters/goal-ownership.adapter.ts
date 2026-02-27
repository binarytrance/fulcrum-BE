import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { IGoalOwnershipVerifier } from '@tasks/domain/ports/goal-ownership.port';

/**
 * Queries the goals collection directly using a minimal projection.
 * Deliberately avoids importing anything from the goals module —
 * this adapter is the only cross-module concern in the tasks infrastructure.
 */
@Injectable()
export class GoalOwnershipAdapter implements IGoalOwnershipVerifier {
  constructor(
    // 'Goal' matches the Mongoose model name registered in GoalMongoModule
    @InjectModel('Goal')
    private readonly goalModel: Model<{
      userId: Types.ObjectId;
      deletedAt: Date | null;
    }>,
  ) {}

  async verifyOwnership(goalId: string, userId: string): Promise<void> {
    const goal = await this.goalModel
      .findOne({ _id: goalId, deletedAt: null }, { userId: 1 })
      .lean<{ userId: Types.ObjectId }>();

    if (!goal || goal.userId.toString() !== userId) {
      throw new NotFoundException('Goal not found.');
    }
  }
}
