import { z } from 'zod';

export const ManualSessionSchema = z.object({
  taskId: z.string().min(1),
  durationMinutes: z
    .number({ error: 'durationMinutes must be a number' })
    .int()
    .min(1)
    .max(24 * 60),
  startedAt: z.iso.datetime({ offset: true }).optional(),
  note: z.string().max(1000).optional(),
});

export type ManualSessionDto = z.infer<typeof ManualSessionSchema>;
