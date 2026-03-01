import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { IGoalAccessPort } from '@habits/domain/ports/goal-access.port';

interface GoalLean {
  userId: { toString(): string };
  deletedAt: Date | null;
}

@Injectable()
export class GoalAccessAdapter implements IGoalAccessPort {
  constructor(
    // Uses the 'Goal' model name registered by GoalMongoModule — no @goals domain import.
    @InjectModel('Goal') private readonly goalModel: Model<GoalLean>,
  ) {}

  async verifyOwnership(goalId: string, userId: string): Promise<void> {
    const goal = await this.goalModel.findById(goalId).lean<GoalLean>().exec();
    if (!goal || goal.deletedAt) throw new NotFoundException('Goal not found.');
    if (goal.userId.toString() !== userId)
      throw new ForbiddenException('Access denied.');
  }
}
