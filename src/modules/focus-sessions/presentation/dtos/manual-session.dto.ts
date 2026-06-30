import { z } from 'zod';

export const ManualSessionSchema = z.object({
  taskId: z.string().min(1),
  duration: z
    .number({ error: 'duration must be a number' })
    .int()
    .min(1_000)
    .max(24 * 60 * 60 * 1_000),
  startedAt: z.iso.datetime({ offset: true }).optional(),
  note: z.string().max(1000).optional(),
});

export type ManualSessionDto = z.infer<typeof ManualSessionSchema>;
