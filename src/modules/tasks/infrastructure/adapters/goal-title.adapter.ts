import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { IGoalTitleLookup } from '@tasks/domain/ports/goal-title.port';

/**
 * Queries the goals collection for a minimal title projection.
 * Follows the same cross-module pattern as GoalOwnershipAdapter —
 * uses the Mongoose model name only, no imports from the goals module.
 */
@Injectable()
export class GoalTitleAdapter implements IGoalTitleLookup {
  constructor(
    @InjectModel('Goal')
    private readonly goalModel: Model<{ title: string }>,
  ) {}

  async fetchTitles(goalIds: string[]): Promise<Map<string, string>> {
    if (goalIds.length === 0) return new Map();

    const docs = await this.goalModel
      .find({ _id: { $in: goalIds }, deletedAt: null }, { title: 1 })
      .lean<{ _id: { toString(): string }; title: string }[]>();

    return new Map(docs.map((d) => [d._id.toString(), d.title]));
  }
}
