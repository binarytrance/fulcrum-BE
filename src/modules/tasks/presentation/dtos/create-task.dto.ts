import { z } from 'zod';
import {
  TaskPriority,
  TaskType,
  MAX_TASK_DURATION_MS,
} from '@tasks/domain/types/task.types';

const flexDate = z.iso.datetime({ offset: true }).transform((v) => new Date(v));

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
  /** ISO 8601 date-time string or date-only string — the date the user plans to work on this */
  scheduledFor: flexDate.optional(),
  /** Time-box in milliseconds — required at creation; max 24 hours (86_400_000 ms) */
  estimatedDuration: z
    .number({ error: 'estimatedDuration is required and must be a number' })
    .int()
    .positive()
    .max(MAX_TASK_DURATION_MS, {
      message: 'estimatedDuration cannot exceed 24 hours (86400000 ms).',
    }),
  estimatedEndDate: flexDate.optional(),
  goalId: z.string().optional(),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
