import { Task } from '@tasks/domain/entities/task.entity';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@tasks/domain/types/task.types';
import { ApiSuccessSchema as BaseApiSuccessSchema } from '@shared/presentation/responses/api-response';

// ─── Re-export shared helper ────────────────────────────────────────────────

/** Wraps an optional `data` schema in the standard { success, message, data? } envelope. */
export const ApiSuccessSchema = BaseApiSuccessSchema;

// ─── Pagination ─────────────────────────────────────────────────────────────

export const PaginatedSchema = (itemSchema: object) => ({
  type: 'object',
  properties: {
    items: { type: 'array', items: itemSchema },
    total: { type: 'integer', example: 30 },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 10 },
    totalPages: { type: 'integer', example: 3 },
  },
});

// ─── Response schemas ───────────────────────────────────────────────────────

export const TaskResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'tsk_abc123' },
    userId: { type: 'string', example: 'user_xyz' },
    goalId: { type: 'string', nullable: true, example: null },
    goalTitle: { type: 'string', nullable: true, example: 'Learn TypeScript' },
    title: { type: 'string', example: 'Write unit tests' },
    description: { type: 'string', nullable: true, example: null },
    status: {
      type: 'string',
      enum: Object.values(TaskStatus),
      example: TaskStatus.PENDING,
    },
    priority: {
      type: 'string',
      enum: Object.values(TaskPriority),
      example: TaskPriority.HIGH,
    },
    type: {
      type: 'string',
      enum: Object.values(TaskType),
      example: TaskType.PLANNED,
    },
    scheduledFor: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-05-08T09:00:00.000Z',
    },
    estimatedEndDate: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: null,
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: null,
    },
    actualEndDate: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: null,
    },
    estimatedDuration: {
      type: 'integer',
      example: 3600000,
      description: 'milliseconds',
    },
    actualDuration: {
      type: 'integer',
      nullable: true,
      example: null,
      description: 'milliseconds',
    },
    efficiencyScore: {
      type: 'number',
      nullable: true,
      example: null,
      description: '>100 faster than estimated, <100 over-run',
    },
    completedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: null,
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const DailyTaskSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'tsk_abc123' },
    title: { type: 'string', example: 'Write unit tests' },
    status: {
      type: 'string',
      enum: Object.values(TaskStatus),
      example: TaskStatus.PENDING,
    },
    priority: {
      type: 'string',
      enum: Object.values(TaskPriority),
      example: TaskPriority.HIGH,
    },
    type: {
      type: 'string',
      enum: Object.values(TaskType),
      example: TaskType.PLANNED,
    },
    scheduledFor: { type: 'string', format: 'date-time', nullable: true },
    estimatedDuration: {
      type: 'integer',
      example: 3600000,
      description: 'milliseconds',
    },
    actualDuration: {
      type: 'integer',
      nullable: true,
      example: null,
      description: 'milliseconds',
    },
    efficiencyScore: { type: 'number', nullable: true, example: null },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    goalId: { type: 'string', nullable: true, example: null },
    goalTitle: { type: 'string', nullable: true, example: null },
  },
};

export const TaskStatsSchema = {
  type: 'object',
  properties: {
    total: { type: 'integer', example: 50 },
    byStatus: {
      type: 'object',
      properties: Object.fromEntries(
        Object.values(TaskStatus).map((s) => [
          s,
          { type: 'integer', example: 0 },
        ]),
      ),
    },
    byType: {
      type: 'object',
      properties: Object.fromEntries(
        Object.values(TaskType).map((t) => [
          t,
          { type: 'integer', example: 0 },
        ]),
      ),
    },
  },
};

// ─── Request body schemas (for @ApiBody) ────────────────────────────────────

export const CreateTaskBodySchema = {
  type: 'object',
  required: ['title', 'estimatedDuration'],
  properties: {
    title: {
      type: 'string',
      maxLength: 200,
      example: 'Write unit tests for auth module',
    },
    description: {
      type: 'string',
      maxLength: 1000,
      nullable: true,
      example: null,
    },
    priority: {
      type: 'string',
      enum: Object.values(TaskPriority),
      example: TaskPriority.HIGH,
      description: 'Defaults to MEDIUM if omitted',
    },
    type: {
      type: 'string',
      enum: Object.values(TaskType),
      example: TaskType.PLANNED,
      description:
        'Auto-derived if omitted — PLANNED when goalId or scheduledFor present',
    },
    scheduledFor: {
      type: 'string',
      example: '2026-05-08T09:00:00.000Z',
      description:
        'YYYY-MM-DD or ISO 8601 — the date the user plans to work on this',
    },
    estimatedDuration: {
      type: 'integer',
      minimum: 1,
      maximum: 86400000,
      example: 3600000,
      description:
        'Time-box in milliseconds — required; max 24 h (86 400 000 ms)',
    },
    estimatedEndDate: {
      type: 'string',
      example: null,
      description: 'YYYY-MM-DD or ISO 8601 — optional target completion date',
    },
    goalId: {
      type: 'string',
      example: null,
      description: 'Link to an existing goal; triggers PLANNED type if omitted',
    },
  },
};

export const CompleteTaskBodySchema = {
  type: 'object',
  properties: {
    actualDuration: {
      type: 'integer',
      minimum: 1,
      example: 3400000,
      description:
        'Actual time spent in milliseconds. Falls back to session-backfilled value, then estimatedDuration, if omitted.',
    },
  },
};

export const UpdateTaskBodySchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      maxLength: 200,
      example: 'Write integration tests',
    },
    description: {
      type: 'string',
      maxLength: 1000,
      nullable: true,
      example: null,
    },
    priority: {
      type: 'string',
      enum: Object.values(TaskPriority),
      example: TaskPriority.MEDIUM,
    },
    status: {
      type: 'string',
      enum: ['PENDING', 'IN_PROGRESS', 'CANCELLED'],
      example: 'IN_PROGRESS',
      description:
        'PENDING↔IN_PROGRESS, either→CANCELLED. Use /complete to mark COMPLETED.',
    },
    scheduledFor: {
      type: 'string',
      nullable: true,
      example: '2026-05-09',
      description: 'YYYY-MM-DD or ISO 8601; null to clear',
    },
    estimatedEndDate: {
      type: 'string',
      nullable: true,
      example: null,
      description: 'YYYY-MM-DD or ISO 8601; null to clear',
    },
    startDate: {
      type: 'string',
      nullable: true,
      example: null,
      description: 'YYYY-MM-DD or ISO 8601; null to clear',
    },
    estimatedDuration: {
      type: 'integer',
      minimum: 1,
      maximum: 86400000,
      example: 5400000,
      description: 'milliseconds; max 24 h',
    },
  },
};

// ─── Response types ─────────────────────────────────────────────────────────

export interface TaskResponse {
  id: string;
  userId: string;
  goalId: string | null;
  goalTitle: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  scheduledFor: Date | null;
  /** Planned end date for the task; null = no target date set */
  estimatedEndDate: Date | null;
  /** Actual date the user started working; null = not yet started */
  startDate: Date | null;
  /** Date the task was completed or cancelled; null = still in progress */
  actualEndDate: Date | null;
  /** Time-box the user set upfront, in milliseconds */
  estimatedDuration: number;
  /** Actual time spent on the task, in milliseconds */
  actualDuration: number | null;
  efficiencyScore: number | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Mapper ─────────────────────────────────────────────────────────────────

/** Maps a Task domain entity to a TaskResponse DTO. */
export function toTaskResponse(
  task: Task,
  goalTitle: string | null,
): TaskResponse {
  return {
    id: task.id,
    userId: task.userId,
    goalId: task.goalId,
    goalTitle,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    scheduledFor: task.scheduledFor,
    estimatedEndDate: task.estimatedEndDate,
    startDate: task.startDate,
    actualEndDate: task.actualEndDate,
    estimatedDuration: task.estimatedDuration,
    actualDuration: task.actualDuration,
    efficiencyScore: task.efficiencyScore,
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

// ─── Pagination helpers ─────────────────────────────────────────────────────

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export function parsePagination(page?: string, limit?: string) {
  const p = Math.max(
    1,
    parseInt(page ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE,
  );
  const l = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(limit ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );
  return { page: p, limit: l };
}
