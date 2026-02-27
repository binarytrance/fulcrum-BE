import { z } from 'zod';

export const CompleteTaskSchema = z.object({
  /**
   * Actual duration in minutes.
   * Optional — if omitted, falls back to estimatedDuration as a placeholder
   * until Phase 4 (Sessions) computes the real value from the sum of session durations.
   */
  actualDuration: z.number().int().positive().optional(),
});

export type CompleteTaskDto = z.infer<typeof CompleteTaskSchema>;
