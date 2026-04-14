import { z } from 'zod';
import {
  GoalCategory,
  GoalPriority,
  GoalStatus,
} from '@goals/domain/types/goal.types';

export const UpdateGoalSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    category: z.nativeEnum(GoalCategory).optional(),
    status: z.nativeEnum(GoalStatus).optional(),
    priority: z.nativeEnum(GoalPriority).optional(),
    estimatedEndDate: z
      .string()
      .datetime({
        message: 'estimatedEndDate must be a valid ISO date-time string.',
      })
      .transform((v) => new Date(v))
      .nullable()
      .optional(),
    estimatedDuration: z.number().int().positive().nullable().optional(),
    estimatedStartDate: z
      .string()
      .datetime({
        message: 'estimatedStartDate must be a valid ISO date-time string.',
      })
      .transform((v) => new Date(v))
      .nullable()
      .optional(),
    actualStartDate: z
      .string()
      .datetime({
        message: 'actualStartDate must be a valid ISO date-time string.',
      })
      .transform((v) => new Date(v))
      .nullable()
      .optional(),
    actualEndDate: z
      .string()
      .datetime({
        message: 'actualEndDate must be a valid ISO date-time string.',
      })
      .transform((v) => new Date(v))
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateGoalDto = z.infer<typeof UpdateGoalSchema>;
