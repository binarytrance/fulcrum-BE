import { z } from 'zod';
import { TaskPriority, TaskType } from '@tasks/domain/types/task.types';

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z
    .nativeEnum(TaskPriority, {
      error: 'priority must be HIGH, MEDIUM, or LOW',
    })
    .optional(),
  type: z
    .nativeEnum(TaskType, { error: 'type must be PLANNED or UNPLANNED' })
    .optional(),
  /** ISO 8601 date-time string — the date the user plans to work on this */
  scheduledFor: z
    .string()
    .datetime({ message: 'scheduledFor must be a valid ISO date-time string.' })
    .transform((v) => new Date(v))
    .optional(),
  /** Time-box in minutes — required at creation */
  estimatedDuration: z
    .number({ error: 'estimatedDuration is required and must be a number' })
    .int()
    .positive(),
  goalId: z.string().optional(),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
