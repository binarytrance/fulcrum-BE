import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '@auth/presentation/guards/jwt-auth.guard';
import type { TokenPayload } from '@auth/domain/types/token.types';

import { ManualSessionService } from '@sessions/application/services/manual-session.service';
import {
  SESSION_REPO_PORT,
  type ISessionRepository,
} from '@sessions/domain/ports/session-repo.port';
import {
  SESSION_TIMER_PORT,
  type ISessionTimerPort,
  type ActiveTimerState,
} from '@sessions/domain/ports/session-timer.port';
import { SessionStatus } from '@sessions/domain/types/session.types';
import {
  ManualSessionSchema,
  type ManualSessionDto,
} from '@sessions/presentation/dtos/manual-session.dto';
import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import {
  ok,
  type ApiResponse as ApiResponseType,
} from '@shared/presentation/responses/api-response';
import type { Session } from '@sessions/domain/entities/session.entity';
import { Inject, ForbiddenException, NotFoundException } from '@nestjs/common';

// ─── Swagger schema helpers ───────────────────────────────────────────────────

const ApiSuccessSchema = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema ? { data: dataSchema } : {}),
  },
});

const DistractionSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', example: 'Phone notification' },
    estimatedMs: { type: 'integer', example: 300000, description: 'milliseconds' },
    loggedAt: { type: 'string', format: 'date-time' },
  },
};

const SessionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'sess_abc123' },
    userId: { type: 'string', example: 'user_xyz' },
    taskId: { type: 'string', example: 'tsk_abc123' },
    status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'ABANDONED'], example: 'COMPLETED' },
    source: { type: 'string', enum: ['AUTO', 'MANUAL'], example: 'MANUAL' },
    startedAt: { type: 'string', format: 'date-time' },
    endedAt: { type: 'string', format: 'date-time', nullable: true },
    durationMs: { type: 'integer', nullable: true, example: 3600000, description: 'milliseconds' },
    netFocusMs: { type: 'integer', nullable: true, example: 3300000, description: 'milliseconds — durationMs minus distraction time' },
    distractions: { type: 'array', items: DistractionSchema },
    plantStatus: { type: 'string', enum: ['HEALTHY', 'WILTING', 'WILTED'], example: 'HEALTHY' },
    plantGrowthPercent: { type: 'integer', example: 92, description: '0–100' },
    elapsedMs: { type: 'integer', nullable: true, example: null, description: 'Only present for ACTIVE sessions — live elapsed ms' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

interface SessionResponse {
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

function computeLiveGrowth(
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

function toSessionResponse(
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

@ApiTags('Sessions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly manualSessionService: ManualSessionService,
    @Inject(SESSION_REPO_PORT)
    private readonly sessionRepo: ISessionRepository,
    @Inject(SESSION_TIMER_PORT)
    private readonly sessionTimer: ISessionTimerPort,
  ) {}

  // ─── Manual time entry ───────────────────────────────────────────────────────

  @Post('manual')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Log a manual session',
    description:
      'Log time spent on a task outside the app (no WebSocket needed). ' +
      'source is set to MANUAL. Counts toward goal progress and task actualDuration.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['taskId', 'durationMs'],
      properties: {
        taskId: { type: 'string', example: 'tsk_abc123', description: 'Task this session is logged against' },
        durationMs: { type: 'integer', minimum: 1000, maximum: 86400000, example: 3600000, description: 'Duration in milliseconds — min 1 s, max 24 h' },
        startedAt: { type: 'string', format: 'date-time', example: '2026-05-07T09:00:00.000Z', description: 'ISO 8601 — defaults to now if omitted' },
        note: { type: 'string', maxLength: 1000, example: 'Deep work block, no interruptions', description: 'Optional free-text note' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Manual session logged.', schema: ApiSuccessSchema(SessionResponseSchema) })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async manual(
    @Req() req: Request,
    @Body(new ZodValidationPipe(ManualSessionSchema)) dto: ManualSessionDto,
  ): Promise<ApiResponseType<SessionResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const session = await this.manualSessionService.execute({ userId, ...dto });
    return ok('Manual session logged.', toSessionResponse(session));
  }

  // ─── Session history for a task ──────────────────────────────────────────────

  @Get('task/:taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all sessions for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Session list returned.', schema: ApiSuccessSchema({ type: 'array', items: SessionResponseSchema }) })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async getByTask(
    @Req() req: Request,
    @Param('taskId') taskId: string,
  ): Promise<ApiResponseType<SessionResponse[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const sessions = await this.sessionRepo.findByTaskId(taskId);
    const owned = sessions.filter((s) => s.userId === userId);
    const responses = await Promise.all(
      owned.map(async (s) => {
        if (s.status === SessionStatus.ACTIVE) {
          const timer = await this.sessionTimer.getTimer(s.id);
          if (timer) return toSessionResponse(s, computeLiveGrowth(s, timer));
        }
        return toSessionResponse(s);
      }),
    );
    return ok('Sessions retrieved.', responses);
  }

  // ─── Single session ──────────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single session by ID' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session returned.', schema: ApiSuccessSchema(SessionResponseSchema) })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  async getOne(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<SessionResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const session = await this.sessionRepo.findById(id);
    if (!session) throw new NotFoundException('Session not found.');
    if (session.userId !== userId)
      throw new ForbiddenException('Access denied.');
    if (session.status === SessionStatus.ACTIVE) {
      const timer = await this.sessionTimer.getTimer(id);
      if (timer) {
        return ok(
          'Session retrieved.',
          toSessionResponse(session, computeLiveGrowth(session, timer)),
        );
      }
    }
    return ok('Session retrieved.', toSessionResponse(session));
  }
}
