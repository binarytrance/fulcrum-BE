import { eq } from 'drizzle-orm';
import { injectable } from 'tsyringe';
import { GoalsTable } from '@core/infra/db/drizzle';
import { Database } from '@shared/services';
import { DatabaseError } from '@shared/errors';
import { ICreateGoal, IGoals } from '@interfaces';

@injectable()
export class GoalsRepository {
  constructor(private db: Database) {}

  public async getGoalsByUserId(userId: IGoals['userId']) {
    try {
      return await this.db.connection
        .select({
          id: GoalsTable.id,
          userId: GoalsTable.userId,
          status: GoalsTable.status,
          description: GoalsTable.description,
          title: GoalsTable.title,
        })
        .from(GoalsTable)
        .where(eq(GoalsTable.userId, userId));
    } catch (err) {
      throw new DatabaseError('selection failed', { error: err });
    }
  }

  public async postGoals(params: ICreateGoal, userId: IGoals['userId']) {
    try {
      return await this.db.connection.transaction(async (tx: any) => {
        const [row] = await tx
          .insert(GoalsTable)
          .values({
            title: params.title,
            description: params.description,
            status: params.status,
            startDate: params.startDate,
            endDate: params.endDate,
            userId,
          })
          .returning();

        return row;
      });
    } catch (err) {
      throw new DatabaseError('insertion failed', { error: err });
    }
  }
}
