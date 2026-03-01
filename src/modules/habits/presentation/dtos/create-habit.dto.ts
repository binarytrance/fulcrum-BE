import { z } from 'zod';
import { HabitFrequency } from '@habits/domain/types/habit.types';

export const CreateHabitSchema = z
  .object({
    goalId: z.string().min(1, 'goalId is required'),
    title: z.string().min(1).max(200),
    description: z.string().max(1000).nullable().optional(),
    frequency: z.nativeEnum(HabitFrequency, {
      error: 'frequency must be daily or specific_days',
    }),
    /**
     * Required when frequency = SPECIFIC_DAYS.
     * Values: 0 = Sunday … 6 = Saturday.
     */
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional().default([]),
    /** Target duration per occurrence in minutes */
    targetDuration: z
      .number({ error: 'targetDuration must be a positive number' })
      .int()
      .positive(),
  })
  .refine(
    (data) =>
      data.frequency !== HabitFrequency.SPECIFIC_DAYS ||
      data.daysOfWeek.length > 0,
    {
      message: 'daysOfWeek must be non-empty when frequency is specific_days',
      path: ['daysOfWeek'],
    },
  );

export type CreateHabitDto = z.infer<typeof CreateHabitSchema>;
