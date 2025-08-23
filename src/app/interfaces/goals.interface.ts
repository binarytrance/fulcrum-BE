import z from 'zod';
import { createGoalSchema } from '@schemas';
import { GoalsTable } from '@core/infra/db/drizzle';
import { InferSelectModel } from 'drizzle-orm';

export type ICreateGoal = z.infer<typeof createGoalSchema>;
export type IGoals = InferSelectModel<typeof GoalsTable>;
