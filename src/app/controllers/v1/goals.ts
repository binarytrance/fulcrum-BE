import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { GoalsParams } from '~/app/schema';
import { BadRequestError, DatabaseError } from '~/app/services';
import { db, GoalsTable } from '~/drizzle';

export class GoalsController {
  constructor() {}

  public async getGoals(req: Request<GoalsParams>, res: Response) {
    try {
      const userId = req.params.userId;
      const goals = await db
        .select({
          id: GoalsTable.id,
          userId: GoalsTable.userId,
          status: GoalsTable.status,
          description: GoalsTable.description,
          title: GoalsTable.title,
        })
        .from(GoalsTable)
        .where(eq(GoalsTable.userId, userId));
      if (!goals.length) {
        throw new BadRequestError();
      }

      res.success(goals, 'goals found', 200);
    } catch (err) {
      throw new DatabaseError();
    }
  }
}
