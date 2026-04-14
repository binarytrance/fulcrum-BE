import { z } from 'zod';

export const CompleteTaskSchema = z
  .object({
    /**
     * Actual duration in milliseconds.
     * Optional — if omitted, falls back to task.actualDuration (session-backfilled)
     * and then to estimatedDuration as a last resort.
     */
    actualDuration: z.number().int().positive().optional(),
  })
  .optional()
  .default({});

export type CompleteTaskDto = z.infer<typeof CompleteTaskSchema>;
