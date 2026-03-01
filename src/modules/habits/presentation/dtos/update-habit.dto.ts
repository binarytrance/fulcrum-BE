import { z } from 'zod';

export const UpdateHabitSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    targetDuration: z.number().int().positive().optional(),
  })
  .refine(
    (d) => Object.keys(d).some((k) => d[k as keyof typeof d] !== undefined),
    {
      message: 'At least one field must be provided',
    },
  );

export type UpdateHabitDto = z.infer<typeof UpdateHabitSchema>;
