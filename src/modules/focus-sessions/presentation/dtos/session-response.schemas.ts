import type { Session } from '@focus-sessions/domain/entities/session.entity';
import type { ActiveTimerState } from '@focus-sessions/domain/ports/session-timer.port';

// ─── Response interface ──────────────────────────────────────────────────────

export interface SessionResponse {
  id: string;
  userId: string;
  taskId: string;
  status: string;
  source: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number | null;
  netFocusMs: number | null;
  distractions: Session['distractions'];
  plantStatus: string;
  plantGrowthPercent: number;
  /** Elapsed milliseconds since session start (only present for ACTIVE sessions). */
  elapsedMs: number | null;
  createdAt: Date;
}

// ─── Swagger schemas ─────────────────────────────────────────────────────────

export const ApiSuccessSchema = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema ? { data: dataSchema } : {}),
  },
});

export const DistractionSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', example: 'Phone notification' },
    estimatedMs: {
      type: 'integer',
      example: 300000,
      description: 'milliseconds',
    },
    loggedAt: { type: 'string', format: 'date-time' },
  },
};

export const SessionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'sess_abc123' },
    userId: { type: 'string', example: 'user_xyz' },
    taskId: { type: 'string', example: 'tsk_abc123' },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'COMPLETED', 'ABANDONED'],
      example: 'COMPLETED',
    },
    source: { type: 'string', enum: ['AUTO', 'MANUAL'], example: 'MANUAL' },
    startedAt: { type: 'string', format: 'date-time' },
    endedAt: { type: 'string', format: 'date-time', nullable: true },
    durationMs: {
      type: 'integer',
      nullable: true,
      example: 3600000,
      description: 'milliseconds',
    },
    netFocusMs: {
      type: 'integer',
      nullable: true,
      example: 3300000,
      description: 'milliseconds — durationMs minus distraction time',
    },
    distractions: { type: 'array', items: DistractionSchema },
    plantStatus: {
      type: 'string',
      enum: ['HEALTHY', 'WILTING', 'WILTED'],
      example: 'HEALTHY',
    },
    plantGrowthPercent: { type: 'integer', example: 92, description: '0–100' },
    elapsedMs: {
      type: 'integer',
      nullable: true,
      example: null,
      description: 'Only present for ACTIVE sessions — live elapsed ms',
    },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

export const ManualSessionBodySchema = {
  type: 'object',
  required: ['taskId', 'durationMs'],
  properties: {
    taskId: {
      type: 'string',
      example: 'tsk_abc123',
      description: 'Task this session is logged against',
    },
    durationMs: {
      type: 'integer',
      minimum: 1000,
      maximum: 86400000,
      example: 3600000,
      description: 'Duration in milliseconds — min 1 s, max 24 h',
    },
    startedAt: {
      type: 'string',
      format: 'date-time',
      example: '2026-05-07T09:00:00.000Z',
      description: 'ISO 8601 — defaults to now if omitted',
    },
    note: {
      type: 'string',
      maxLength: 1000,
      example: 'Deep work block, no interruptions',
      description: 'Optional free-text note',
    },
  },
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

export function computeLiveGrowth(
  s: Session,
  timer: ActiveTimerState,
): { plantGrowthPercent: number; elapsedMs: number } {
  const elapsedMs = Date.now() - timer.startedAt;
  const totalDistractionMs = s.distractions.reduce(
    (sum, d) => sum + d.estimatedMs,
    0,
  );
  const netFocusMs = Math.max(0, elapsedMs - totalDistractionMs);
  const plantGrowthPercent =
    timer.taskEstimatedDurationMs > 0
      ? Math.min(
          100,
          Math.round((netFocusMs / timer.taskEstimatedDurationMs) * 100),
        )
      : 0;
  return { plantGrowthPercent, elapsedMs };
}

export function toSessionResponse(
  s: Session,
  liveData?: { plantGrowthPercent: number; elapsedMs: number },
): SessionResponse {
  return {
    id: s.id,
    userId: s.userId,
    taskId: s.taskId,
    status: s.status,
    source: s.source,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    durationMs: s.durationMs,
    netFocusMs: s.netFocusMs,
    distractions: s.distractions,
    plantStatus: s.plantStatus,
    plantGrowthPercent: liveData?.plantGrowthPercent ?? s.plantGrowthPercent,
    elapsedMs: liveData?.elapsedMs ?? null,
    createdAt: s.createdAt,
  };
}
