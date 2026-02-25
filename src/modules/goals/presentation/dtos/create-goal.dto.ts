import { z } from 'zod';
import { GoalCategory, GoalPriority } from '@goals/domain/types/goal.types';

export const CreateGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  category: z.nativeEnum(GoalCategory, {
    error: `Category must be one of: ${Object.values(GoalCategory).join(', ')}`,
  }),
  priority: z.nativeEnum(GoalPriority).optional(),
  deadline: z
    .string()
    .datetime({ message: 'Deadline must be a valid ISO date-time string.' })
    .transform((v) => new Date(v))
    .optional(),
  estimatedHours: z.number().positive().optional(),
  parentGoalId: z.string().optional(),
});

export type CreateGoalDto = z.infer<typeof CreateGoalSchema>;
