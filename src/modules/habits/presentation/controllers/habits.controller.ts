import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
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

import { CreateHabitService } from '@habits/application/services/create-habit.service';
import { GetHabitsService } from '@habits/application/services/get-habits.service';
import { UpdateHabitService } from '@habits/application/services/update-habit.service';
import { DeleteHabitService } from '@habits/application/services/delete-habit.service';
import { CompleteOccurrenceService } from '@habits/application/services/complete-occurrence.service';
import { SkipOccurrenceService } from '@habits/application/services/skip-occurrence.service';
import { GetAnalyticsService } from '@habits/application/services/get-analytics.service';
import { GetOccurrencesService } from '@habits/application/services/get-occurrences.service';

import {
  CreateHabitSchema,
  type CreateHabitDto,
} from '@habits/presentation/dtos/create-habit.dto';
import {
  UpdateHabitSchema,
  type UpdateHabitDto,
} from '@habits/presentation/dtos/update-habit.dto';
import {
  UpdateOccurrenceStatusSchema,
  type UpdateOccurrenceStatusDto,
} from '@habits/presentation/dtos/update-occurrence-status.dto';

import {
  HABIT_OCCURRENCE_REPO_PORT,
  type IHabitOccurrenceRepository,
} from '@habits/domain/ports/habit-occurrence-repo.port';
import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import {
  ok,
  paginated,
  type ApiResponse as ApiResponseType,
  type PaginatedResponse,
} from '@shared/presentation/responses/api-response';
import { HabitStatus } from '@habits/domain/types/habit.types';
import type { HabitFilter } from '@habits/domain/ports/habit-repo.port';

// ─── Swagger schema helpers ───────────────────────────────────────────────────

const ApiSuccessSchema = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema ? { data: dataSchema } : {}),
  },
});

const PaginatedSchema = (itemSchema: object) => ({
  type: 'object',
  properties: {
    items: { type: 'array', items: itemSchema },
    total: { type: 'integer', example: 20 },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 10 },
    totalPages: { type: 'integer', example: 2 },
  },
});

const HabitResponseSchema = {
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
      enum: ['DAILY', 'SPECIFIC_DAYS'],
      example: 'DAILY',
    },
    daysOfWeek: {
      type: 'array',
      items: { type: 'integer' },
      example: [1, 3, 5],
      description: '0=Sun … 6=Sat',
    },
    targetDuration: {
      type: 'integer',
      example: 1800000,
      description: 'milliseconds',
    },
    status: {
      type: 'string',
      enum: Object.values(HabitStatus),
      example: 'ACTIVE',
    },
    currentStreak: { type: 'integer', example: 7 },
    longestStreak: { type: 'integer', example: 21 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const OccurrenceResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'occ_abc123' },
    habitId: { type: 'string', example: 'hbt_abc123' },
    userId: { type: 'string', example: 'user_xyz' },
    date: { type: 'string', example: '2026-05-07', description: 'YYYY-MM-DD' },
    status: {
      type: 'string',
      enum: ['PENDING', 'COMPLETED', 'MISSED', 'SKIPPED'],
      example: 'PENDING',
    },
    completedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: null,
    },
    skippedAt: {
      type: 'string',
      format: 'date-time',
      nullable: true,
      example: null,
    },
    sessionId: { type: 'string', nullable: true, example: null },
    duration: { type: 'number', nullable: true, example: 1920000 },
    notes: { type: 'string', nullable: true, example: null },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const HistoryEntrySchema = {
  type: 'object',
  properties: {
    date: { type: 'string', example: '2026-05-07', description: 'YYYY-MM-DD' },
    status: {
      type: 'string',
      enum: ['PENDING', 'COMPLETED', 'MISSED', 'SKIPPED'],
      nullable: true,
      example: 'COMPLETED',
    },
  },
};

const HabitWithHistorySchema = {
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

const DailyHabitEntrySchema = {
  type: 'object',
  properties: {
    ...HabitResponseSchema.properties,
    occurrenceId: { type: 'string', example: 'occ_abc123' },
    occurrenceStatus: {
      type: 'string',
      enum: ['PENDING', 'COMPLETED', 'MISSED', 'SKIPPED'],
      example: 'PENDING',
    },
  },
};

const HabitAnalyticsSchema = {
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
    avgDuration: { type: 'number', nullable: true, example: 1890000 },
    mostMissedDayOfWeek: {
      type: 'integer',
      nullable: true,
      example: 1,
      description: '0=Sun … 6=Sat; null if insufficient data',
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

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

import type { Habit } from '@habits/domain/entities/habit.entity';
import type { HabitOccurrence } from '@habits/domain/entities/habit-occurrence.entity';
import type { HabitAnalytics } from '@habits/application/services/get-analytics.service';

// ─── Response shapes ─────────────────────────────────────────────────────────

interface HabitResponse {
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

interface OccurrenceResponse {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  status: string;
  completedAt: Date | null;
  skippedAt: Date | null;
  sessionId: string | null;
  duration: number | null;
  notes: string | null;
  createdAt: Date;
}

function toHabitResponse(h: Habit): HabitResponse {
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

function toOccurrenceResponse(o: HabitOccurrence): OccurrenceResponse {
  return {
    id: o.id,
    habitId: o.habitId,
    userId: o.userId,
    date: o.date,
    status: o.status,
    completedAt: o.completedAt,
    skippedAt: o.skippedAt,
    sessionId: o.sessionId,
    duration: o.duration,
    notes: o.notes,
    createdAt: o.createdAt,
  };
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('Habits')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('habits')
export class HabitsController {
  constructor(
    private readonly createHabitService: CreateHabitService,
    private readonly getHabitsService: GetHabitsService,
    private readonly updateHabitService: UpdateHabitService,
    private readonly deleteHabitService: DeleteHabitService,
    private readonly completeOccurrenceService: CompleteOccurrenceService,
    private readonly skipOccurrenceService: SkipOccurrenceService,
    private readonly getAnalyticsService: GetAnalyticsService,
    private readonly getOccurrencesService: GetOccurrencesService,
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
  ) {}

  // ─── Habits ──────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new habit linked to a goal' })
  @ApiBody({
    schema: {
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
          description:
            'Link to an existing goal ID; null for standalone habits',
        },
        frequency: {
          type: 'string',
          enum: ['DAILY', 'SPECIFIC_DAYS'],
          example: 'SPECIFIC_DAYS',
        },
        daysOfWeek: {
          type: 'array',
          items: { type: 'integer', minimum: 0, maximum: 6 },
          example: [1, 3, 5],
          description:
            '0=Sun … 6=Sat — required when frequency is specific_days',
        },
        targetDuration: {
          type: 'integer',
          minimum: 1,
          example: 1800000,
          description: 'Target milliseconds per occurrence',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Habit created with 30 days of occurrences.',
    schema: ApiSuccessSchema(HabitResponseSchema),
  })
  async create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(CreateHabitSchema)) dto: CreateHabitDto,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.createHabitService.execute({
      userId,
      title: dto.title,
      description: dto.description,
      frequency: dto.frequency,
      daysOfWeek: dto.daysOfWeek,
      targetDuration: dto.targetDuration,
      goalId: dto.goalId ?? null,
    });
    return ok('Habit created successfully.', toHabitResponse(habit));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all habits for the authenticated user (paginated)',
    description:
      'Each habit includes a 7-day completion history (oldest → today, null status = not scheduled that day). ' +
      'Date filtering is by habit creation date: provide only startDate to get habits created on that day, ' +
      'or startDate + endDate to get habits created within that range. Omit both to return all habits.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', minimum: 1, default: 1 },
    example: 1,
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
  @ApiQuery({
    name: 'status',
    required: false,
    enum: HabitStatus,
    description: 'Filter by habit status',
  })
  @ApiQuery({
    name: 'goalId',
    required: false,
    schema: { type: 'string' },
    description: 'Filter by linked goal ID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    schema: { type: 'string' },
    example: '2026-01-01',
    description:
      'YYYY-MM-DD — alone: returns habits created on that day; with endDate: returns habits created in the range',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    schema: { type: 'string' },
    example: '2026-05-10',
    description:
      'YYYY-MM-DD — upper bound of creation date range; only valid when startDate is also provided',
  })
  @ApiResponse({
    status: 200,
    description: 'Habits returned.',
    schema: ApiSuccessSchema(PaginatedSchema(HabitWithHistorySchema)),
  })
  async list(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('goalId') goalId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<
    ApiResponseType<
      PaginatedResponse<
        HabitResponse & { history: { date: string; status: string | null }[] }
      >
    >
  > {
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new BadRequestException(
        "'startDate' must be in YYYY-MM-DD format.",
      );
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new BadRequestException("'endDate' must be in YYYY-MM-DD format.");
    }

    const { sub: userId } = req.user as TokenPayload;
    const pagination = parsePagination(page, limit);
    const filter: HabitFilter = {};
    if (status && Object.values(HabitStatus).includes(status as HabitStatus)) {
      filter.status = status as HabitStatus;
    }
    if (goalId) filter.goalId = goalId;
    if (startDate) {
      filter.createdAfter = startDate;
      filter.createdBefore = endDate ?? startDate; // single day if no endDate
    }

    const { items, total } = await this.getHabitsService.getPaged(
      userId,
      filter,
      pagination.page,
      pagination.limit,
    );

    // Build 7-day window (6 days ago → today)
    const today = new Date().toISOString().slice(0, 10);
    const windowStart = (() => {
      const d = new Date(`${today}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() - 6);
      return d.toISOString().slice(0, 10);
    })();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(`${today}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }

    const rawOccurrences =
      items.length > 0
        ? await this.occurrenceRepo.findByUserInDateRange(
            userId,
            windowStart,
            today,
          )
        : [];

    // Index by habitId → date → status
    const byHabit = new Map<string, Map<string, string>>();
    for (const occ of rawOccurrences) {
      if (!byHabit.has(occ.habitId)) byHabit.set(occ.habitId, new Map());
      byHabit.get(occ.habitId)!.set(occ.date, occ.status);
    }

    const responseItems = items.map((h) => ({
      ...toHabitResponse(h),
      history: days.map((date) => ({
        date,
        status: byHabit.get(h.id)?.get(date) ?? null,
      })),
    }));

    return paginated(
      'Habits retrieved successfully.',
      responseItems,
      total,
      pagination.page,
      pagination.limit,
    );
  }

  @Get('daily')
  @Get('due-today')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Get today's pending habit occurrences merged with habit data (daily planner)",
    description:
      'Alias routes supported: GET /habits/daily and GET /habits/due-today. ' +
      'Returns pending occurrences joined with habit details for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: "Today's habits returned.",
    schema: ApiSuccessSchema({ type: 'array', items: DailyHabitEntrySchema }),
  })
  async dueToday(
    @Req() req: Request,
  ): Promise<
    ApiResponseType<
      (HabitResponse & { occurrenceId: string; occurrenceStatus: string })[]
    >
  > {
    const { sub: userId } = req.user as TokenPayload;
    const entries = await this.getOccurrencesService.getDueToday(userId);
    return ok(
      "Today's habits retrieved successfully.",
      entries.map(({ habit, occurrence }) => ({
        ...toHabitResponse(habit),
        occurrenceId: occurrence.id,
        occurrenceStatus: occurrence.status,
      })),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiResponse({
    status: 200,
    description: 'Habit returned.',
    schema: ApiSuccessSchema(HabitResponseSchema),
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Habit not found.' })
  async getOne(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.getHabitsService.getOne(id, userId);
    return ok('Habit retrieved successfully.', toHabitResponse(habit));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({
    summary: 'Update habit title, description, or targetDuration',
    description:
      'Partial update endpoint for editable habit fields. ' +
      'Status transitions are handled via dedicated pause/resume endpoints.',
  })
  @ApiBody({
    description: 'All fields optional. At least one must be present.',
    schema: {
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
          example: 2700000,
          description: 'Target milliseconds per occurrence',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Habit updated.',
    schema: ApiSuccessSchema(HabitResponseSchema),
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Habit not found.' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateHabitSchema)) dto: UpdateHabitDto,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.updateHabitService.update({ id, userId, ...dto });
    return ok('Habit updated successfully.', toHabitResponse(habit));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({
    summary: 'Abandon a habit',
    description:
      'Marks the habit as abandoned. Sets deletedAt — data is preserved in MongoDB for analytics/history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Habit abandoned.',
    schema: ApiSuccessSchema(),
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Habit not found.' })
  async delete(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType> {
    const { sub: userId } = req.user as TokenPayload;
    await this.deleteHabitService.execute(id, userId);
    return ok('Habit abandoned successfully.');
  }

  @Patch(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({
    summary: 'Pause an active habit (occurrences stop being generated)',
    description:
      'Transitions habit status from ACTIVE to PAUSED. ' +
      'Future occurrence generation is halted until resumed.',
  })
  @ApiResponse({
    status: 200,
    description: 'Habit paused.',
    schema: ApiSuccessSchema(HabitResponseSchema),
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Habit not found.' })
  async pause(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.updateHabitService.pause({ id, userId });
    return ok('Habit paused successfully.', toHabitResponse(habit));
  }

  @Patch(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({
    summary: 'Resume a paused habit',
    description:
      'Transitions habit status from PAUSED to ACTIVE and resumes future occurrence generation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Habit resumed.',
    schema: ApiSuccessSchema(HabitResponseSchema),
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Habit not found.' })
  async resume(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.updateHabitService.resume({ id, userId });
    return ok('Habit resumed successfully.', toHabitResponse(habit));
  }

  // ─── Occurrences ─────────────────────────────────────────────────────────

  @Get(':id/occurrences')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({ summary: 'Get all occurrences for a habit' })
  @ApiResponse({
    status: 200,
    description: 'Occurrences returned.',
    schema: ApiSuccessSchema({
      type: 'array',
      items: OccurrenceResponseSchema,
    }),
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Habit not found.' })
  async getOccurrences(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<OccurrenceResponse[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const occurrences = await this.getOccurrencesService.getByHabit(id, userId);
    return ok(
      'Occurrences retrieved successfully.',
      occurrences.map(toOccurrenceResponse),
    );
  }

  @Patch(':id/occurrences/:occurrenceId')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiParam({ name: 'occurrenceId', description: 'Occurrence ID' })
  @ApiOperation({
    summary: 'Update a habit occurrence status',
    description:
      'Set status to "completed" or "skipped". ' +
      'When completing, duration must be >= targetDuration * 0.8 (20% grace window) and triggers streak recalculation asynchronously. ' +
      'Skipped occurrences do not break the streak and are tracked explicitly for analytics.',
  })
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          required: ['status', 'duration'],
          properties: {
            status: { type: 'string', enum: ['COMPLETED'] },
            duration: {
              type: 'integer',
              minimum: 1,
              example: 1920000,
              description:
                'Actual milliseconds spent — must be ≥ targetDuration × 0.8',
            },
            sessionId: {
              type: 'string',
              example: null,
              description:
                'Optional: link to a session logged for this occurrence',
            },
            notes: {
              type: 'string',
              maxLength: 500,
              example: 'Felt great today',
              description: 'Optional free-text notes',
            },
          },
        },
        {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['SKIPPED'] },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Occurrence status updated.',
    schema: ApiSuccessSchema(OccurrenceResponseSchema),
  })
  @ApiResponse({
    status: 400,
    description: 'Duration below grace threshold or invalid transition.',
  })
  @ApiResponse({ status: 404, description: 'Occurrence not found.' })
  async updateOccurrenceStatus(
    @Req() req: Request,
    @Param('occurrenceId') occurrenceId: string,
    @Body(new ZodValidationPipe(UpdateOccurrenceStatusSchema))
    dto: UpdateOccurrenceStatusDto,
  ): Promise<ApiResponseType<OccurrenceResponse>> {
    const { sub: userId } = req.user as TokenPayload;

    if (dto.status === 'COMPLETED') {
      const occurrence = await this.completeOccurrenceService.execute({
        occurrenceId,
        userId,
        duration: dto.duration,
        sessionId: dto.sessionId,
        notes: dto.notes,
      });
      return ok(
        'Occurrence completed successfully.',
        toOccurrenceResponse(occurrence),
      );
    }

    const occurrence = await this.skipOccurrenceService.execute(
      occurrenceId,
      userId,
    );
    return ok(
      'Occurrence skipped successfully.',
      toOccurrenceResponse(occurrence),
    );
  }

  // ─── Analytics ───────────────────────────────────────────────────────────

  @Get(':id/analytics')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({
    summary: 'Get habit analytics',
    description:
      'Returns completion rate, average duration, streaks, and day-of-week miss patterns over the last 30 days.',
  })
  @ApiResponse({
    status: 200,
    description: 'Habit analytics returned.',
    schema: ApiSuccessSchema(HabitAnalyticsSchema),
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Habit not found.' })
  async analytics(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<HabitAnalytics>> {
    const { sub: userId } = req.user as TokenPayload;
    const analytics = await this.getAnalyticsService.execute(id, userId);
    return ok('Analytics retrieved successfully.', analytics);
  }
}
