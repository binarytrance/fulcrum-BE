import { z } from 'zod';
import { GoalCategory, GoalPriority } from '@goals/domain/types/goal.types';

const flexDate = z.iso.datetime({ offset: true }).transform((v) => new Date(v));

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
