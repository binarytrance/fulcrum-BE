import z from 'zod';
import { goalStatuses } from '~/app/shared/services/db/drizzle';

export const createGoalSchema = z
  .object({
    title: z.string().min(3),
    description: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    status: z.enum(goalStatuses),
  })
  .strict();


