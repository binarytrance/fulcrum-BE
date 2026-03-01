import { z } from 'zod';

export const CompleteOccurrenceSchema = z.object({
  /** Actual time spent in minutes */
  durationMinutes: z
    .number({ error: 'durationMinutes must be a positive number' })
    .int()
    .positive(),
  /** Optional: link to a session that was run for this occurrence */
  sessionId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export type CompleteOccurrenceDto = z.infer<typeof CompleteOccurrenceSchema>;
