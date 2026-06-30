import { z } from 'zod';

export const UpdateOccurrenceStatusSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('completed'),
    duration: z.number({ error: 'duration must be a positive number' }).int().positive(),
    sessionId: z.string().optional(),
    notes: z.string().max(500).optional(),
  }),
  z.object({
    status: z.literal('skipped'),
  }),
]);

export type UpdateOccurrenceStatusDto = z.infer<typeof UpdateOccurrenceStatusSchema>;
