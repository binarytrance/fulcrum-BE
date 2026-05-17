import { Goal } from '@goals/domain/entities/goal.entity';
import {
  GoalCategory,
  GoalPriority,
  GoalProgress,
  GoalStatus,
} from '@goals/domain/types/goal.types';

// ─── Response interface ───────────────────────────────────────────────────────

export interface GoalResponse {
  id: string;
  userId: string;
  parentGoalId: string | null;
  title: string;
  description: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: GoalPriority;
  /** Planned end date for the goal; null = no deadline set */
  estimatedEndDate: Date | null;
  /** Estimated duration to complete this goal in milliseconds; null = not set */
  estimatedDuration: number | null;
  /** When the user plans to start the goal; null = not set */
  estimatedStartDate: Date | null;
  /** Actual date the goal was started; null = not yet started */
  actualStartDate: Date | null;
  /** Date the goal was completed or abandoned; null = still in progress */
  actualEndDate: Date | null;
  /** True when the goal is active and all tasks are complete (score >= 100) */
  isReadyToComplete: boolean;
  /** True when the goal deadline passed without completion (status === MISSED). */
  isOverdue: boolean;
  level: number;
  progress: GoalProgress;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function toGoalResponse(goal: Goal): GoalResponse {
  return {
    id: goal.id,
    userId: goal.userId,
    parentGoalId: goal.parentGoalId,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    status: goal.status,
    priority: goal.priority,
    estimatedEndDate: goal.estimatedEndDate,
    estimatedDuration: goal.estimatedDuration,
    estimatedStartDate: goal.estimatedStartDate,
    actualStartDate: goal.actualStartDate,
    actualEndDate: goal.actualEndDate,
    isReadyToComplete:
      goal.progress.score >= 100 && goal.status === GoalStatus.ACTIVE,
    isOverdue: goal.status === GoalStatus.MISSED,
    level: goal.level,
    progress: goal.progress,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

// ─── Swagger schema helpers ───────────────────────────────────────────────────

export const PaginatedSchema = (itemSchema: object) => ({
  type: 'object',
  properties: {
    items: { type: 'array', items: itemSchema },
    total: { type: 'integer', example: 42 },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 10 },
    totalPages: { type: 'integer', example: 5 },
  },
});

export const GoalProgressSchema = {
  type: 'object',
  properties: {
    totalTasks: { type: 'integer', example: 7 },
    completedTasks: { type: 'integer', example: 3 },
    totalLoggedMs: { type: 'integer', example: 7200000 },
    score: { type: 'number', example: 42, description: '0–100' },
    lastComputedAt: { type: 'string', format: 'date-time' },
  },
};

export const GoalResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'abc123' },
    userId: { type: 'string', example: 'user123' },
    parentGoalId: { type: 'string', nullable: true, example: null },
    title: { type: 'string', example: 'Learn TypeScript' },
    description: {
      type: 'string',
      nullable: true,
      example: 'Master advanced TS patterns',
    },
    category: {
      type: 'string',
      enum: Object.values(GoalCategory),
      example: GoalCategory.LEARNING,
    },
    status: {
      type: 'string',
      enum: Object.values(GoalStatus),
      example: GoalStatus.ACTIVE,
    },
    priority: {
      type: 'string',
      enum: Object.values(GoalPriority),
      example: GoalPriority.HIGH,
    },
    estimatedEndDate: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: '2026-12-31T00:00:00.000Z',
    },
    estimatedDuration: {
      type: 'integer',
      nullable: true,
      example: 3600000,
      description: 'milliseconds',
    },
    estimatedStartDate: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: null,
    },
    actualStartDate: {
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
    isReadyToComplete: { type: 'boolean', example: false },
    isOverdue: { type: 'boolean', example: false },
    level: {
      type: 'integer',
      example: 1,
      description: '1 = top-level, 2 = sub-goal, 3 = sub-sub-goal',
    },
    progress: GoalProgressSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const GoalStatsSchema = {
  type: 'object',
  properties: {
    total: { type: 'integer', example: 12 },
    byStatus: {
      type: 'object',
      properties: Object.fromEntries(
        Object.values(GoalStatus).map((s) => [
          s,
          { type: 'integer', example: 0 },
        ]),
      ),
    },
  },
};

// ─── Request body schemas (for @ApiBody) ──────────────────────────────────────

export const CreateGoalBodySchema = {
  type: 'object',
  required: ['title', 'category', 'estimatedDuration'],
  properties: {
    title: { type: 'string', maxLength: 200, example: 'Learn TypeScript' },
    description: {
      type: 'string',
      maxLength: 1000,
      example: 'Master advanced TS patterns',
      nullable: true,
    },
    category: {
      type: 'string',
      enum: Object.values(GoalCategory),
      example: GoalCategory.LEARNING,
    },
    priority: {
      type: 'string',
      enum: Object.values(GoalPriority),
      example: GoalPriority.HIGH,
      description: 'Defaults to MEDIUM if omitted',
    },
    estimatedEndDate: {
      type: 'string',
      example: '2026-12-31',
      description: 'YYYY-MM-DD or ISO 8601 datetime',
    },
    estimatedDuration: {
      type: 'integer',
      example: 7200000,
      description: 'milliseconds — e.g. 7200000 = 2 hours',
    },
    estimatedStartDate: {
      type: 'string',
      example: '2026-06-01',
      description: 'YYYY-MM-DD or ISO 8601 datetime',
    },
    parentGoalId: {
      type: 'string',
      example: null,
      description: 'Omit for top-level goals; max nesting depth is 3',
    },
  },
};

export const UpdateGoalBodySchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      maxLength: 200,
      example: 'Learn TypeScript deeply',
    },
    description: {
      type: 'string',
      maxLength: 1000,
      nullable: true,
      example: 'Focus on generics and decorators',
    },
    category: {
      type: 'string',
      enum: Object.values(GoalCategory),
      example: GoalCategory.LEARNING,
    },
    status: {
      type: 'string',
      enum: Object.values(GoalStatus),
      example: GoalStatus.PAUSED,
      description:
        'ACTIVE→PAUSED|COMPLETED|ABANDONED; PAUSED→ACTIVE|ABANDONED; COMPLETED→ACTIVE',
    },
    priority: {
      type: 'string',
      enum: Object.values(GoalPriority),
      example: GoalPriority.MEDIUM,
    },
    estimatedEndDate: {
      type: 'string',
      nullable: true,
      example: '2026-12-31',
      description: 'YYYY-MM-DD or ISO 8601; null to clear',
    },
    estimatedDuration: {
      type: 'integer',
      nullable: true,
      example: 7200000,
      description: 'milliseconds; null to clear',
    },
    estimatedStartDate: {
      type: 'string',
      nullable: true,
      example: null,
      description: 'YYYY-MM-DD or ISO 8601; null to clear',
    },
    actualStartDate: {
      type: 'string',
      nullable: true,
      example: null,
      description: 'YYYY-MM-DD or ISO 8601; null to clear',
    },
    actualEndDate: {
      type: 'string',
      nullable: true,
      example: null,
      description: 'YYYY-MM-DD or ISO 8601; null to clear',
    },
  },
};
