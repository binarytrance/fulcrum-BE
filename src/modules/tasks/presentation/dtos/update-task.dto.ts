import { z } from 'zod';
import {
  TaskPriority,
  TaskStatus,
  MAX_TASK_DURATION_MS,
} from '@tasks/domain/types/task.types';

/**
 * Accepts both a date-only string (YYYY-MM-DD) and a full ISO 8601 datetime
 * string (with or without timezone offset), and coerces both to a Date object.
 */
const flexDate = z
  .union([z.iso.datetime({ offset: true }), z.iso.date()])
  .transform((v) => new Date(v));

export const UpdateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    priority: z
      .nativeEnum(TaskPriority, {
        error: 'priority must be HIGH, MEDIUM, or LOW',
      })
      .optional(),
    scheduledFor: flexDate.nullable().optional(),
    estimatedEndDate: flexDate.nullable().optional(),
    startDate: flexDate.nullable().optional(),
    /** Time-box in milliseconds; max 24 hours (86_400_000 ms) */
    estimatedDuration: z
      .number()
      .int()
      .positive()
      .max(MAX_TASK_DURATION_MS, {
        message: 'estimatedDuration cannot exceed 24 hours (86400000 ms).',
      })
      .optional(),
    status: z
      .nativeEnum(TaskStatus, {
        error: 'status must be PENDING, IN_PROGRESS, COMPLETED, or CANCELLED',
      })
      .optional(),
    /** Actual time spent in milliseconds — used to compute efficiencyScore when completing a task. Falls back to session-backfilled value then estimatedDuration if omitted. */
    actualDuration: z.number().int().positive().optional(),
    /** ISO 8601 datetime — required when status is COMPLETED. */
    completedAt: flexDate.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  })
  .refine(
    (data) => data.status !== TaskStatus.COMPLETED || data.completedAt !== undefined,
    { message: "'completedAt' is required when completing a task.", path: ['completedAt'] },
  );

export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
