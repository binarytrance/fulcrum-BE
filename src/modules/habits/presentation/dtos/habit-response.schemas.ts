import {
  HabitStatus,
  OccurrenceStatus,
} from '@habits/domain/types/habit.types';
import type { Habit } from '@habits/domain/entities/habit.entity';
import type { HabitOccurrence } from '@habits/domain/entities/habit-occurrence.entity';

// Re-export ApiSuccessSchema from shared so consumers can get everything from one place
export { ApiSuccessSchema } from '@shared/presentation/responses/api-response';

// ─── Swagger schema helpers ───────────────────────────────────────────────────

export const PaginatedSchema = (itemSchema: object) => ({
  type: 'object',
  properties: {
    items: { type: 'array', items: itemSchema },
    total: { type: 'integer', example: 20 },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 10 },
    totalPages: { type: 'integer', example: 2 },
  },
});

// ─── Response schemas ─────────────────────────────────────────────────────────

export const HabitResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'hbt_abc123' },
    userId: { type: 'string', example: 'user_xyz' },
    goalId: { type: 'string', nullable: true, example: null },
    title: { type: 'string', example: 'Morning run' },
    description: {
      type: 'string',
      nullable: true,
      example: '30 min outdoor run',
    },
    frequency: {
      type: 'string',
      enum: ['daily', 'specific_days'],
      example: 'daily',
    },
    daysOfWeek: {
      type: 'array',
      items: { type: 'integer' },
      example: [1, 3, 5],
      description: '0=Sun … 6=Sat',
    },
    targetDuration: { type: 'integer', example: 30, description: 'minutes' },
    status: {
      type: 'string',
      enum: Object.values(HabitStatus),
      example: 'active',
    },
    currentStreak: { type: 'integer', example: 7 },
    longestStreak: { type: 'integer', example: 21 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

export const OccurrenceResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'occ_abc123' },
    habitId: { type: 'string', example: 'hbt_abc123' },
    userId: { type: 'string', example: 'user_xyz' },
    date: { type: 'string', example: '2026-05-07', description: 'YYYY-MM-DD' },
    status: {
      type: 'string',
      enum: Object.values(OccurrenceStatus),
      example: 'pending',
    },
    completedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: null,
    },
    sessionId: { type: 'string', nullable: true, example: null },
    durationMinutes: { type: 'number', nullable: true, example: 32 },
    note: { type: 'string', nullable: true, example: null },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const HistoryEntrySchema = {
  type: 'object',
  properties: {
    date: { type: 'string', example: '2026-05-07', description: 'YYYY-MM-DD' },
    status: {
      type: 'string',
      enum: Object.values(OccurrenceStatus),
      nullable: true,
      example: 'completed',
    },
  },
};

export const HabitWithHistorySchema = {
  type: 'object',
  properties: {
    ...HabitResponseSchema.properties,
    history: {
      type: 'array',
      items: HistoryEntrySchema,
      description:
        'Always exactly 7 entries ordered oldest→today, anchored to server date. ' +
        'status is null when the habit had no occurrence on that day (e.g. weekday-specific habit on a weekend).',
    },
  },
};

export const DailyHabitEntrySchema = {
  type: 'object',
  properties: {
    ...HabitResponseSchema.properties,
    occurrenceId: { type: 'string', example: 'occ_abc123' },
    occurrenceStatus: {
      type: 'string',
      enum: Object.values(OccurrenceStatus),
      example: 'pending',
    },
  },
};

export const HabitAnalyticsSchema = {
  type: 'object',
  properties: {
    habitId: { type: 'string', example: 'hbt_abc123' },
    currentStreak: { type: 'integer', example: 7 },
    longestStreak: { type: 'integer', example: 21 },
    completionRatePct: {
      type: 'number',
      example: 80,
      description: '0–100 over the last 30 days',
    },
    totalCompleted: { type: 'integer', example: 24 },
    totalMissed: { type: 'integer', example: 4 },
    totalSkipped: { type: 'integer', example: 2 },
    avgDurationMinutes: { type: 'number', nullable: true, example: 31.5 },
    mostMissedDayOfWeek: {
      type: 'integer',
      nullable: true,
      example: 1,
      description: '0=Sun … 6=Sat; null if insufficient data',
    },
  },
};

// ─── Request body schemas (OpenAPI) ───────────────────────────────────────────

export const CreateHabitOpenApiSchema = {
  type: 'object',
  required: ['title', 'frequency', 'targetDuration'],
  properties: {
    title: { type: 'string', maxLength: 200, example: 'Morning run' },
    description: {
      type: 'string',
      maxLength: 1000,
      nullable: true,
      example: '30 min outdoor run',
    },
    goalId: {
      type: 'string',
      nullable: true,
      example: null,
      description: 'Link to an existing goal ID; null for standalone habits',
    },
    frequency: {
      type: 'string',
      enum: ['daily', 'specific_days'],
      example: 'specific_days',
    },
    daysOfWeek: {
      type: 'array',
      items: { type: 'integer', minimum: 0, maximum: 6 },
      example: [1, 3, 5],
      description: '0=Sun … 6=Sat — required when frequency is specific_days',
    },
    targetDuration: {
      type: 'integer',
      minimum: 1,
      example: 30,
      description: 'Target minutes per occurrence',
    },
  },
};

export const UpdateHabitOpenApiSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: 200, example: 'Evening run' },
    description: {
      type: 'string',
      maxLength: 1000,
      nullable: true,
      example: null,
    },
    targetDuration: {
      type: 'integer',
      minimum: 1,
      example: 45,
      description: 'Target minutes per occurrence',
    },
  },
};

export const CompleteOccurrenceOpenApiSchema = {
  type: 'object',
  required: ['durationMinutes'],
  properties: {
    durationMinutes: {
      type: 'integer',
      minimum: 1,
      example: 32,
      description: 'Actual minutes spent — must be ≥ targetDuration × 0.8',
    },
    sessionId: {
      type: 'string',
      example: null,
      description: 'Optional: link to a session logged for this occurrence',
    },
    note: {
      type: 'string',
      maxLength: 500,
      example: 'Felt great today',
      description: 'Optional free-text note',
    },
  },
};

// ─── Response interfaces ──────────────────────────────────────────────────────

export interface HabitResponse {
  id: string;
  userId: string;
  goalId: string | null;
  title: string;
  description: string | null;
  frequency: string;
  daysOfWeek: number[];
  targetDuration: number;
  status: string;
  currentStreak: number;
  longestStreak: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OccurrenceResponse {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  status: string;
  completedAt: Date | null;
  sessionId: string | null;
  durationMinutes: number | null;
  note: string | null;
  createdAt: Date;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

export function toHabitResponse(h: Habit): HabitResponse {
  return {
    id: h.id,
    userId: h.userId,
    goalId: h.goalId,
    title: h.title,
    description: h.description,
    frequency: h.frequency,
    daysOfWeek: h.daysOfWeek,
    targetDuration: h.targetDuration,
    status: h.status,
    currentStreak: h.currentStreak,
    longestStreak: h.longestStreak,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
  };
}

export function toOccurrenceResponse(o: HabitOccurrence): OccurrenceResponse {
  return {
    id: o.id,
    habitId: o.habitId,
    userId: o.userId,
    date: o.date,
    status: o.status,
    completedAt: o.completedAt,
    sessionId: o.sessionId,
    durationMinutes: o.durationMinutes,
    note: o.note,
    createdAt: o.createdAt,
  };
}
