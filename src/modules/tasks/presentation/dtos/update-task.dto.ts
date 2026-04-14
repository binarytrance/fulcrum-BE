import { z } from 'zod';
import {
  TaskPriority,
  TaskStatus,
  MAX_TASK_DURATION_MS,
} from '@tasks/domain/types/task.types';

export const UpdateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    priority: z
      .nativeEnum(TaskPriority, {
        error: 'priority must be HIGH, MEDIUM, or LOW',
      })
      .optional(),
    scheduledFor: z
      .string()
      .datetime({
        message: 'scheduledFor must be a valid ISO date-time string.',
      })
      .transform((v) => new Date(v))
      .nullable()
      .optional(),
    estimatedEndDate: z
      .string()
      .datetime({
        message: 'estimatedEndDate must be a valid ISO date-time string.',
      })
      .transform((v) => new Date(v))
      .nullable()
      .optional(),
    startDate: z
      .string()
      .datetime({ message: 'startDate must be a valid ISO date-time string.' })
      .transform((v) => new Date(v))
      .nullable()
      .optional(),
    /** Time-box in milliseconds; max 24 hours (86_400_000 ms) */
    estimatedDuration: z
      .number()
      .int()
      .positive()
      .max(MAX_TASK_DURATION_MS, {
        message: 'estimatedDuration cannot exceed 24 hours (86400000 ms).',
      })
      .optional(),
    /**
     * Status transitions: PENDING ↔ IN_PROGRESS, either → CANCELLED.
     * To complete a task use the dedicated PATCH /tasks/:id/complete endpoint.
     */
    status: z
      .nativeEnum(TaskStatus, {
        error: 'status must be PENDING, IN_PROGRESS, or CANCELLED',
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
