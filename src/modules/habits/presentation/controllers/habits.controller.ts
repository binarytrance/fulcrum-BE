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
  CompleteOccurrenceSchema,
  type CompleteOccurrenceDto,
} from '@habits/presentation/dtos/complete-occurrence.dto';

import {
  HABIT_OCCURRENCE_REPO_PORT,
  type IHabitOccurrenceRepository,
} from '@habits/domain/ports/habit-occurrence-repo.port';
import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import {
  ok,
  paginated,
  ApiSuccessSchema,
  type ApiResponse as ApiResponseType,
  type PaginatedResponse,
} from '@shared/presentation/responses/api-response';
import { HabitStatus } from '@habits/domain/types/habit.types';
import type { HabitFilter } from '@habits/domain/ports/habit-repo.port';

import {
  PaginatedSchema,
  HabitResponseSchema,
  OccurrenceResponseSchema,
  HabitWithHistorySchema,
  DailyHabitEntrySchema,
  HabitAnalyticsSchema,
  CreateHabitOpenApiSchema,
  UpdateHabitOpenApiSchema,
  CompleteOccurrenceOpenApiSchema,
  toHabitResponse,
  toOccurrenceResponse,
  type HabitResponse,
  type OccurrenceResponse,
} from '@habits/presentation/dtos/habit-response.schemas';

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

import type { HabitAnalytics } from '@habits/application/services/get-analytics.service';

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
  @ApiBody({ schema: CreateHabitOpenApiSchema })
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
    schema: UpdateHabitOpenApiSchema,
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
    summary: 'Archive (soft-delete) a habit',
    description:
      'Sets deletedAt. Data is preserved in MongoDB and can be used for analytics/history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Habit archived.',
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
    return ok('Habit archived successfully.');
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

  @Patch(':id/occurrences/:occurrenceId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiParam({ name: 'occurrenceId', description: 'Occurrence ID' })
  @ApiOperation({
    summary: 'Mark a habit occurrence as completed',
    description:
      'durationMinutes must be >= targetDuration * 0.8 (20% grace window). ' +
      'Triggers streak recalculation asynchronously. ' +
      'Use this endpoint instead of generic habit update for completion transitions.',
  })
  @ApiBody({ schema: CompleteOccurrenceOpenApiSchema })
  @ApiResponse({
    status: 200,
    description: 'Occurrence completed.',
    schema: ApiSuccessSchema(OccurrenceResponseSchema),
  })
  @ApiResponse({
    status: 400,
    description: 'Duration below grace threshold or invalid transition.',
  })
  @ApiResponse({ status: 404, description: 'Occurrence not found.' })
  async completeOccurrence(
    @Req() req: Request,
    @Param('occurrenceId') occurrenceId: string,
    @Body(new ZodValidationPipe(CompleteOccurrenceSchema))
    dto: CompleteOccurrenceDto,
  ): Promise<ApiResponseType<OccurrenceResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const occurrence = await this.completeOccurrenceService.execute({
      occurrenceId,
      userId,
      ...dto,
    });
    return ok(
      'Occurrence completed successfully.',
      toOccurrenceResponse(occurrence),
    );
  }

  @Patch(':id/occurrences/:occurrenceId/skip')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiParam({ name: 'occurrenceId', description: 'Occurrence ID' })
  @ApiOperation({
    summary: 'Skip a habit occurrence',
    description:
      'Skipped occurrences do not break the streak and are tracked explicitly for analytics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Occurrence skipped.',
    schema: ApiSuccessSchema(OccurrenceResponseSchema),
  })
  @ApiResponse({ status: 404, description: 'Occurrence not found.' })
  async skipOccurrence(
    @Req() req: Request,
    @Param('occurrenceId') occurrenceId: string,
  ): Promise<ApiResponseType<OccurrenceResponse>> {
    const { sub: userId } = req.user as TokenPayload;
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
