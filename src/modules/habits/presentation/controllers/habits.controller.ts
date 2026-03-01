import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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

import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import {
  ok,
  type ApiResponse as ApiResponseType,
} from '@shared/presentation/responses/api-response';

import type { Habit } from '@habits/domain/entities/habit.entity';
import type { HabitOccurrence } from '@habits/domain/entities/habit-occurrence.entity';
import type { HabitAnalytics } from '@habits/application/services/get-analytics.service';

// ─── Response shapes ─────────────────────────────────────────────────────────

interface HabitResponse {
  id: string;
  userId: string;
  goalId: string;
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
  sessionId: string | null;
  durationMinutes: number | null;
  note: string | null;
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
    sessionId: o.sessionId,
    durationMinutes: o.durationMinutes,
    note: o.note,
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
  ) {}

  // ─── Habits ──────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new habit linked to a goal' })
  @ApiResponse({
    status: 201,
    description: 'Habit created with 30 days of occurrences.',
  })
  async create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(CreateHabitSchema)) dto: CreateHabitDto,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.createHabitService.execute({ userId, ...dto });
    return ok('Habit created.', toHabitResponse(habit));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all habits for the authenticated user' })
  @ApiQuery({
    name: 'goalId',
    required: false,
    description: 'Filter by goal ID',
  })
  async list(
    @Req() req: Request,
    @Query('goalId') goalId?: string,
  ): Promise<ApiResponseType<HabitResponse[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const habits = await this.getHabitsService.execute({ userId, goalId });
    return ok('Habits retrieved.', habits.map(toHabitResponse));
  }

  @Get('due-today')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get today's pending habit occurrences (daily planner)",
  })
  async dueToday(
    @Req() req: Request,
  ): Promise<ApiResponseType<OccurrenceResponse[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const occurrences = await this.getOccurrencesService.getDueToday(userId);
    return ok(
      "Today's habits retrieved.",
      occurrences.map(toOccurrenceResponse),
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  async getOne(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.getHabitsService.getOne(id, userId);
    return ok('Habit retrieved.', toHabitResponse(habit));
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({
    summary: 'Update habit title, description, or targetDuration',
  })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateHabitSchema)) dto: UpdateHabitDto,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.updateHabitService.update({ id, userId, ...dto });
    return ok('Habit updated.', toHabitResponse(habit));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({ summary: 'Archive (soft-delete) a habit' })
  async archive(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.deleteHabitService.execute(id, userId);
    return ok('Habit archived.', toHabitResponse(habit));
  }

  @Patch(':id/pause')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({
    summary: 'Pause an active habit (occurrences stop being generated)',
  })
  async pause(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.updateHabitService.pause({ id, userId });
    return ok('Habit paused.', toHabitResponse(habit));
  }

  @Patch(':id/resume')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({ summary: 'Resume a paused habit' })
  async resume(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<HabitResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const habit = await this.updateHabitService.resume({ id, userId });
    return ok('Habit resumed.', toHabitResponse(habit));
  }

  // ─── Occurrences ─────────────────────────────────────────────────────────

  @Get(':id/occurrences')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiOperation({ summary: 'Get all occurrences for a habit' })
  async getOccurrences(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<OccurrenceResponse[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const occurrences = await this.getOccurrencesService.getByHabit(id, userId);
    return ok('Occurrences retrieved.', occurrences.map(toOccurrenceResponse));
  }

  @Patch(':id/occurrences/:occurrenceId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiParam({ name: 'occurrenceId', description: 'Occurrence ID' })
  @ApiOperation({
    summary: 'Mark a habit occurrence as completed',
    description:
      'durationMinutes must be >= targetDuration * 0.8 (20% grace window). ' +
      'Triggers streak recalculation asynchronously.',
  })
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
    return ok('Occurrence completed.', toOccurrenceResponse(occurrence));
  }

  @Patch(':id/occurrences/:occurrenceId/skip')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'id', description: 'Habit ID' })
  @ApiParam({ name: 'occurrenceId', description: 'Occurrence ID' })
  @ApiOperation({
    summary: 'Skip a habit occurrence',
    description: 'Skipped occurrences do not break the streak.',
  })
  async skipOccurrence(
    @Req() req: Request,
    @Param('occurrenceId') occurrenceId: string,
  ): Promise<ApiResponseType<OccurrenceResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const occurrence = await this.skipOccurrenceService.execute(
      occurrenceId,
      userId,
    );
    return ok('Occurrence skipped.', toOccurrenceResponse(occurrence));
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
  async analytics(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<HabitAnalytics>> {
    const { sub: userId } = req.user as TokenPayload;
    const analytics = await this.getAnalyticsService.execute(id, userId);
    return ok('Analytics retrieved.', analytics);
  }
}
