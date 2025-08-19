import z from 'zod';
import { createGoalSchema } from '~/app/schemas';
import { GoalsTable } from '~/app/shared/services/db/drizzle';
import { InferSelectModel } from 'drizzle-orm';

export type ICreateGoal = z.infer<typeof createGoalSchema>;
export type IGoals = InferSelectModel<typeof GoalsTable>;
