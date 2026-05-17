import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '@auth/presentation/guards/jwt-auth.guard';
import type { TokenPayload } from '@auth/domain/types/token.types';

import { ManualSessionService } from '@focus-sessions/application/services/manual-session.service';
import {
  SESSION_REPO_PORT,
  type ISessionRepository,
} from '@focus-sessions/domain/ports/session-repo.port';
import {
  SESSION_TIMER_PORT,
  type ISessionTimerPort,
} from '@focus-sessions/domain/ports/session-timer.port';
import {
  PlantStatus,
  SessionSource,
  SessionSortBy,
  SessionStatus,
} from '@focus-sessions/domain/types/session.types';
import type {
  SessionListFilter,
  SessionListSort,
} from '@focus-sessions/domain/ports/session-repo.port';
import {
  ManualSessionSchema,
  type ManualSessionDto,
} from '@focus-sessions/presentation/dtos/manual-session.dto';
import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import {
  ok,
  paginated,
  type ApiResponse as ApiResponseType,
  type PaginatedResponse,
} from '@shared/presentation/responses/api-response';
import {
  ApiSuccessSchema,
  SessionResponseSchema,
  ManualSessionBodySchema,
  computeLiveGrowth,
  toSessionResponse,
  type SessionResponse,
} from '@focus-sessions/presentation/dtos/session-response.schemas';

// ─── Pagination helpers ───────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parsePagination(page?: string, limit?: string) {
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@ApiTags('Focus Sessions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('focus-sessions')
export class FocusSessionsController {
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
  @ApiBody({ schema: ManualSessionBodySchema })
  @ApiResponse({
    status: 201,
    description: 'Manual session logged.',
    schema: ApiSuccessSchema(SessionResponseSchema),
  })
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

  // ─── List sessions for authenticated user ───────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List focus sessions',
    description:
      "Returns a paginated list of the authenticated user's focus sessions. " +
      'startDate is required (YYYY-MM-DD). endDate is optional — when omitted it defaults to startDate, returning all sessions for that day.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    example: '2026-05-10',
    description: 'Start of date range (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    example: '2026-05-10',
    description: 'End of date range (YYYY-MM-DD). Defaults to startDate.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SessionStatus,
    description: 'Filter by session status',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    enum: SessionSource,
    description: 'Filter by session source',
  })
  @ApiQuery({
    name: 'plantStatus',
    required: false,
    enum: PlantStatus,
    description: 'Filter by plant status',
  })
  @ApiQuery({
    name: 'taskId',
    required: false,
    schema: { type: 'string' },
    description: 'Filter by task ID',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: SessionSortBy,
    description: 'Sort field',
    example: SessionSortBy.STARTED_AT,
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort direction',
    example: 'desc',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', minimum: 1, default: DEFAULT_PAGE },
    example: DEFAULT_PAGE,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: MAX_LIMIT,
      default: DEFAULT_LIMIT,
    },
    example: DEFAULT_LIMIT,
  })
  @ApiResponse({ status: 200, description: 'Sessions returned.' })
  @ApiResponse({ status: 400, description: 'startDate is missing or invalid.' })
  async getList(
    @Req() req: Request,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('plantStatus') plantStatus?: string,
    @Query('taskId') taskId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<PaginatedResponse<SessionResponse>>> {
    const { sub: userId } = req.user as TokenPayload;

    if (!startDate || !DATE_RE.test(startDate)) {
      throw new BadRequestException(
        'startDate is required and must be YYYY-MM-DD.',
      );
    }
    if (endDate && !DATE_RE.test(endDate)) {
      throw new BadRequestException('endDate must be YYYY-MM-DD.');
    }

    const filter: SessionListFilter = { startDate, endDate };
    if (
      status &&
      Object.values(SessionStatus).includes(status as SessionStatus)
    ) {
      filter.status = status as SessionStatus;
    }
    if (
      source &&
      Object.values(SessionSource).includes(source as SessionSource)
    ) {
      filter.source = source as SessionSource;
    }
    if (
      plantStatus &&
      Object.values(PlantStatus).includes(plantStatus as PlantStatus)
    ) {
      filter.plantStatus = plantStatus as PlantStatus;
    }
    if (taskId) filter.taskId = taskId;

    const sort: SessionListSort = {
      by: Object.values(SessionSortBy).includes(sortBy as SessionSortBy)
        ? (sortBy as SessionSortBy)
        : SessionSortBy.STARTED_AT,
      order: sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const pagination = parsePagination(page, limit);
    const { items, total } = await this.sessionRepo.findByUser(
      userId,
      filter,
      sort,
      pagination,
    );

    const responses = await Promise.all(
      items.map(async (s) => {
        if (s.status === SessionStatus.ACTIVE) {
          const timer = await this.sessionTimer.getTimer(s.id);
          if (timer) return toSessionResponse(s, computeLiveGrowth(s, timer));
        }
        return toSessionResponse(s);
      }),
    );

    return paginated(
      'Sessions retrieved.',
      responses,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  // ─── Session history for a task ──────────────────────────────────────────────

  @Get('task/:taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all sessions for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Session list returned.',
    schema: ApiSuccessSchema({ type: 'array', items: SessionResponseSchema }),
  })
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
  @ApiResponse({
    status: 200,
    description: 'Session returned.',
    schema: ApiSuccessSchema(SessionResponseSchema),
  })
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
