import z from 'zod';
import {
  createGoalBodySchema,
  deleteGoalParamsSchema,
  editGoalBodySchema,
  editGoalParamsSchema,
  getGoalQuerySchema,
} from '@schemas';
import { GoalsTable } from '@core/infra/db/drizzle';
import { InferSelectModel } from 'drizzle-orm';

export type ICreateBodyGoal = z.infer<typeof createGoalBodySchema>;
export type IGoal = InferSelectModel<typeof GoalsTable>;
export type IDeleteParamsGoal = z.infer<typeof deleteGoalParamsSchema>;
export type IEditBodyGoal = z.infer<typeof editGoalBodySchema>;
export type IEditParamsGoal = z.infer<typeof editGoalParamsSchema>;
export type IGetGoalsQueryParams = z.infer<typeof getGoalQuerySchema>;

export interface IGoalCursor {
  createdAt: IGoal['createdAt'];
  goalId: IGoal['id'];
  userId: IGoal['userId'];
}

export interface IGoalPaginationOptions {
  limit?: number;
  next?: string;
}

export interface IGoalsByUserResponse {
  items: Array<Omit<IGoal, 'createdAt'>>;
  next: string | null;
}
