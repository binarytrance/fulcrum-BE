import z from 'zod';
import { goalStatuses } from '@core/infra/db/drizzle';

const goalBodySchema = z
  .object({
    title: z.string().min(3),
    description: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum(goalStatuses),
  })
  .strict();

const goalParamsSchema = z
  .object({
    goalId: z.string().uuid(),
  })
  .strict();

const goalQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  next: z.string().optional(),
});

export const createGoalBodySchema = goalBodySchema;
export const deleteGoalParamsSchema = goalParamsSchema;
export const editGoalParamsSchema = goalParamsSchema;
export const editGoalBodySchema = goalBodySchema;
export const getGoalQuerySchema = goalQuerySchema;
