import { z } from 'zod';
import { GoalCategory, GoalPriority } from '@goals/domain/types/goal.types';

/**
 * Accepts both a date-only string (YYYY-MM-DD) and a full ISO 8601 datetime
 * string (with or without timezone offset), and coerces both to a Date object.
 */
const flexDate = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((v) => new Date(v));

export const CreateGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  category: z.nativeEnum(GoalCategory, {
    error: `Category must be one of: ${Object.values(GoalCategory).join(', ')}`,
  }),
  priority: z.nativeEnum(GoalPriority).optional(),
  estimatedEndDate: flexDate.optional(),
  estimatedDuration: z.number().int().positive().optional(),
  estimatedStartDate: flexDate.optional(),
  parentGoalId: z.string().optional(),
});

export type CreateGoalDto = z.infer<typeof CreateGoalSchema>;