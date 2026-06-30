import { z } from 'zod';

export const CompleteOccurrenceSchema = z.object({
  /** Actual time spent in milliseconds */
  duration: z
    .number({ error: 'duration must be a positive number' })
    .int()
    .positive(),
  /** Optional: link to a session that was run for this occurrence */
  sessionId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export type CompleteOccurrenceDto = z.infer<typeof CompleteOccurrenceSchema>;
