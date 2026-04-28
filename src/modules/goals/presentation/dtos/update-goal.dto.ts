import { z } from 'zod';
import {
  GoalCategory,
  GoalPriority,
  GoalStatus,
} from '@goals/domain/types/goal.types';

/**
 * Accepts both a date-only string (YYYY-MM-DD) and a full ISO 8601 datetime
 * string (with or without timezone offset), and coerces both to a Date object.
 */
const flexDate = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((v) => new Date(v));

export const UpdateGoalSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    category: z.nativeEnum(GoalCategory).optional(),
    status: z.nativeEnum(GoalStatus).optional(),
    priority: z.nativeEnum(GoalPriority).optional(),
    estimatedEndDate: flexDate.nullable().optional(),
    estimatedDuration: z.number().int().positive().nullable().optional(),
    estimatedStartDate: flexDate.nullable().optional(),
    actualStartDate: flexDate.nullable().optional(),
    actualEndDate: flexDate.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateGoalDto = z.infer<typeof UpdateGoalSchema>;
