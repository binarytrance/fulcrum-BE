import z from 'zod';
import { goalStatuses } from '~/drizzle';

export const goalsParamsSchema = z.object({
  userId: z.string().uuid('userId is not of type uuid'),
});

export const createGoalSchema = z
  .object({
    title: z.string().min(3),
    description: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum(goalStatuses),
  })
  .strict();

export type CreateGoalSchema = z.infer<typeof createGoalSchema>;
