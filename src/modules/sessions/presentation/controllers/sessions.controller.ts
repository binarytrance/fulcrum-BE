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

interface SessionResponse {
  id: string;
  userId: string;
  taskId: string;
  status: string;
  source: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  netFocusMinutes: number | null;
  distractions: Session['distractions'];
  plantStatus: string;
  plantGrowthPercent: number;
  /** Elapsed minutes since session start (only present for ACTIVE sessions). */
  elapsedMinutes: number | null;
  createdAt: Date;
}

function computeLiveGrowth(
  s: Session,
  timer: ActiveTimerState,
): { plantGrowthPercent: number; elapsedMinutes: number } {
  const elapsedMs = Date.now() - timer.startedAt;
  const elapsedMinutes = elapsedMs / 60_000;
  const totalDistractionMins = s.distractions.reduce(
    (sum, d) => sum + d.estimatedMinutes,
    0,
  );
  const netFocus = Math.max(0, elapsedMinutes - totalDistractionMins);
  const plantGrowthPercent =
    timer.taskEstimatedDurationMinutes > 0
      ? Math.min(
          100,
          Math.round((netFocus / timer.taskEstimatedDurationMinutes) * 100),
        )
      : 0;
  return { plantGrowthPercent, elapsedMinutes: Math.round(elapsedMinutes) };
}

function toSessionResponse(
  s: Session,
  liveData?: { plantGrowthPercent: number; elapsedMinutes: number },
): SessionResponse {
  return {
    id: s.id,
    userId: s.userId,
    taskId: s.taskId,
    status: s.status,
    source: s.source,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    durationMinutes: s.durationMinutes,
    netFocusMinutes: s.netFocusMinutes,
    distractions: s.distractions,
    plantStatus: s.plantStatus,
    plantGrowthPercent: liveData?.plantGrowthPercent ?? s.plantGrowthPercent,
    elapsedMinutes: liveData?.elapsedMinutes ?? null,
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
  @ApiResponse({ status: 201, description: 'Manual session logged.' })
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
  @ApiResponse({ status: 200, description: 'Session list returned.' })
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
  @ApiResponse({ status: 200, description: 'Session returned.' })
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
