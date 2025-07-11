import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { TasksParams } from '~/app/schema';
import { BadRequestError, DatabaseError } from '~/app/services';
import { db, TasksTable } from '~/drizzle';

export class TaskController {
  constructor() {}

  public async getTasks(req: Request<TasksParams>, res: Response) {
    try {
      const goalId = req.params.goalId;
      const goals = await db
        .select({
          id: TasksTable.id,
          goalId: TasksTable.goalId,
          status: TasksTable.status,
          description: TasksTable.description,
          title: TasksTable.title,
        })
        .from(TasksTable)
        .where(eq(TasksTable.goalId, goalId));
      if (!goals.length) {
        throw new BadRequestError();
      }

      res.success(goals, 'tasks found', 200);
    } catch (err) {
      throw new DatabaseError();
    }
  }
}
