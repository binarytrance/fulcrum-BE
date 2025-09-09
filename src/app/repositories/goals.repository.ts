import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import { injectable } from 'tsyringe';
import { GoalsTable } from '@core/infra/db/drizzle';
import { Database } from '@core/infra';
import { BadRequestError, DatabaseError, NotFoundError } from '@shared/errors';
import {
  ICreateBodyGoal,
  IEditBodyGoal,
  IGoal,
  IGoalsByUserResponse,
  IGoalCursor,
  IGoalPaginationOptions,
} from '@interfaces';
import { Env } from '@shared/config';

@injectable()
export class GoalsRepository {
  constructor(private readonly db: Database, private readonly env: Env) {}

  public async findGoalsByUserId(
    userId: IGoal['userId'],
    paginationOptions: IGoalPaginationOptions
  ): Promise<IGoalsByUserResponse> {
    const limit = Math.min(paginationOptions?.limit ?? 2, 100);
    const cursor = paginationOptions?.next
      ? this.decodeCursor(paginationOptions.next, userId)
      : '';

    try {
      const mainCond = eq(GoalsTable.userId, userId);
      const cursorCond = cursor
        ? or(
            lt(GoalsTable.createdAt, new Date(cursor.createdAt)),
            and(
              eq(GoalsTable.createdAt, new Date(cursor.createdAt)),
              lt(GoalsTable.id, cursor.goalId)
            )
          )
        : '';
      const whereCond = cursorCond ? and(mainCond, cursorCond) : mainCond;

      const rows = await this.db.connection
        .select({
          id: GoalsTable.id,
          userId: GoalsTable.userId,
          status: GoalsTable.status,
          description: GoalsTable.description,
          title: GoalsTable.title,
          startDate: GoalsTable.startDate,
          endDate: GoalsTable.endDate,
          updatedAt: GoalsTable.updatedAt,
        })
        .from(GoalsTable)
        .where(whereCond)
        .orderBy(desc(GoalsTable.createdAt), GoalsTable.id)
        .limit(limit + 1);

      const hasNext = rows.length > limit;
      const items = hasNext ? rows.slice(0, limit) : rows;
      const last = items[items.length - 1];
      const nextCursor = last
        ? this.encodeCursor({
            createdAt: last.updatedAt,
            goalId: last.id,
            userId: last.userId,
          })
        : null;

      return { next: nextCursor, items };
    } catch (err) {
      throw new DatabaseError('selection failed', { error: err });
    }
  }

  public async insertGoalByUserId(
    params: ICreateBodyGoal,
    userId: IGoal['userId']
  ) {
    try {
      const [row] = await this.db.connection
        .insert(GoalsTable)
        .values({
          title: params.title,
          description: params.description,
          status: params.status,
          startDate: new Date(params.startDate),
          endDate: new Date(params.endDate),
          userId,
        })
        .returning();

      return row;
    } catch (err) {
      throw new DatabaseError('insertion failed', { error: err });
    }
  }

  public async updateGoalsByUserId(
    params: IEditBodyGoal,
    userId: IGoal['userId'],
    goalId: IGoal['id']
  ) {
    try {
      const rows = await this.db.connection
        .update(GoalsTable)
        .set({
          updatedAt: new Date(),
          description: params.description,
          title: params.title,
          status: params.status,
          startDate: new Date(params.startDate),
          endDate: new Date(params.endDate),
        })
        .where(and(eq(GoalsTable.id, goalId), eq(GoalsTable.userId, userId)))
        .returning();

      if (!rows.length) {
        throw new NotFoundError('Goal not found or version conflict');
      }

      return rows[0];
    } catch (err: unknown) {
      throw new DatabaseError('updation failed', { error: err });
    }
  }

  public async deleteGoalByUserId(
    goalId: IGoal['id'],
    userId: IGoal['userId']
  ) {
    try {
      const result = await this.db.connection
        .delete(GoalsTable)
        .where(and(eq(GoalsTable.id, goalId), eq(GoalsTable.userId, userId)));

      if (!result.rowCount) {
        throw new NotFoundError('Goal not found');
      }
    } catch (err) {
      throw new DatabaseError('Deletion failed', { error: err });
    }
  }

  private encodeCursor(params: IGoalCursor): string {
    const body = Buffer.from(JSON.stringify(params), 'utf-8');
    const mac = this.sign(body);
    return `${this.base64URL(body)}.${this.base64URL(mac)}`;
  }

  private decodeCursor(
    token: string,
    expectedUserId: IGoal['userId']
  ): IGoalCursor | null {
    const [bodyBase64, macBase64] = token.split('.');
    if (!bodyBase64 || !macBase64) {
      throw new BadRequestError('bad curson token format');
    }

    const body = Buffer.from(bodyBase64, 'base64url');
    const mac = Buffer.from(macBase64, 'base64url');
    const want = this.sign(body);

    if (mac.length !== want.length || !timingSafeEqual(mac, want)) {
      throw new BadRequestError('invalid cursor token ');
    }

    const parsed = JSON.parse(body.toString('utf-8')) as IGoalCursor;

    if (parsed.userId !== expectedUserId) {
      throw new BadRequestError('bad cursor token');
    }

    return parsed;
  }

  private sign(buf: Buffer): Buffer<ArrayBufferLike> {
    return createHmac('sha256', this.env.app.HMAC_SECRET).update(buf).digest();
  }

  private base64URL(buf: Buffer): string {
    return buf.toString('base64url');
  }
}
