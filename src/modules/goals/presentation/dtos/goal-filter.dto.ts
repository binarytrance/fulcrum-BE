import { z } from 'zod';
import { GoalCategory, GoalStatus } from '@goals/domain/types/goal.types';

export const GoalFilterSchema = z.object({
  status: z.nativeEnum(GoalStatus).optional(),
  category: z.nativeEnum(GoalCategory).optional(),
});

export type GoalFilterDto = z.infer<typeof GoalFilterSchema>;
