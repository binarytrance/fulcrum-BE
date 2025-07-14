import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { CreateGoalSchema } from '~/app/schema';
import { BadRequestError, DatabaseError, Cache } from '~/app/services';
import { db, GoalsTable } from '~/drizzle';

export class GoalsController {
  private cache: Cache;
  private parentkey: string;

  constructor(parentKey: string) {
    this.cache = Cache.getInstance();
    this.parentkey = parentKey;
    this.getGoals = this.getGoals.bind(this);
    this.postGoal = this.postGoal.bind(this);
  }

  private constructKey(userId: string): string {
    return `${this.parentkey}:${userId}`;
  }

  public async getGoals(req: Request, res: Response) {
    try {
      const userId = req.session.user?.id!;
      const cacheKey = this.constructKey(userId);
      const goals = await this.cache.getOrSet(cacheKey, async () => {
        return await db
          .select({
            id: GoalsTable.id,
            userId: GoalsTable.userId,
            status: GoalsTable.status,
            description: GoalsTable.description,
            title: GoalsTable.title,
          })
          .from(GoalsTable)
          .where(eq(GoalsTable.userId, userId));
      });

      if (!goals?.length) {
        throw new BadRequestError();
      }

      res.success(goals, 'goals found', 200);
    } catch (err) {
      throw new DatabaseError('error getting goals', { error: err });
    }
  }

  public async postGoal(req: Request<{}, {}, CreateGoalSchema>, res: Response) {
    try {
      const userId = req.session.user?.id!;
      const cacheKey = this.constructKey(userId);
      await this.cache.delete(cacheKey);
      const [goal] = await db
        .insert(GoalsTable)
        .values({
          title: req.body.title,
          description: req.body.description,
          status: req.body.status,
          startDate: req.body.startDate,
          endDate: req.body.endDate,
          userId,
        })
        .returning();
      res.success(goal, 'goal created', 201);
    } catch (err) {
      console.error(err);
      throw new DatabaseError('error creating post', { error: err });
    }
  }
}
