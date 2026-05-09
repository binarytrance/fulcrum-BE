import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
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

import { GetDailyAnalyticsService } from '@analytics/application/services/get-daily-analytics.service';
import { GetGoalAnalyticsService } from '@analytics/application/services/get-goal-analytics.service';
import { GetWeeklyAnalyticsService } from '@analytics/application/services/get-weekly-analytics.service';
import { GetMonthlyAnalyticsService } from '@analytics/application/services/get-monthly-analytics.service';
import { GetEstimationProfileService } from '@analytics/application/services/get-estimation-profile.service';
import { GetDashboardService } from '@analytics/application/services/get-dashboard.service';

import {
  ok,
  type ApiResponse as ApiResponseType,
} from '@shared/presentation/responses/api-response';

import type { DailyAnalytics } from '@analytics/domain/entities/daily-analytics.entity';
import type { GoalAnalytics } from '@analytics/domain/entities/goal-analytics.entity';
import type { WeeklyAnalytics } from '@analytics/domain/entities/weekly-analytics.entity';
import type { MonthlyAnalytics } from '@analytics/domain/entities/monthly-analytics.entity';
import type { EstimationProfile } from '@analytics/domain/entities/estimation-profile.entity';
import type { DashboardResult } from '@analytics/application/services/get-dashboard.service';
import { USER_REPO_PORT, type IUserRepository } from '@users/domain/ports/user-rep.port';
import type { AppStreak } from '@users/domain/types/user.types';

// ─── Swagger schema helpers ───────────────────────────────────────────────────

const ApiSuccessSchema = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema ? { data: dataSchema } : {}),
  },
});

const TimeleakSchema = {
  type: 'object',
  properties: {
    startTime: { type: 'string', example: '10:30', description: 'HH:MM — when previous session ended' },
    endTime: { type: 'string', example: '11:15', description: 'HH:MM — when next session started' },
    gapMinutes: { type: 'integer', example: 45 },
  },
};

const DailyAnalyticsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    date: { type: 'string', example: '2026-05-07', description: 'YYYY-MM-DD' },
    totalLoggedMinutes: { type: 'number', example: 240 },
    netFocusMinutes: { type: 'number', example: 200 },
    deepWorkMinutes: { type: 'number', example: 120 },
    shallowWorkMinutes: { type: 'number', example: 80 },
    sessionCount: { type: 'integer', example: 3 },
    totalDistractions: { type: 'integer', example: 5 },
    totalDistractionMinutes: { type: 'number', example: 40 },
    avgDistractionPerSession: { type: 'number', example: 1.7 },
    totalTaskCount: { type: 'integer', example: 8 },
    plannedTaskCount: { type: 'integer', example: 5 },
    unplannedTaskCount: { type: 'integer', example: 3 },
    completedTaskCount: { type: 'integer', example: 6 },
    unplannedPercent: { type: 'number', example: 37.5, description: '0–100' },
    taskCompletionRate: { type: 'number', example: 75, description: '0–100' },
    totalHabitCount: { type: 'integer', example: 3 },
    completedHabitCount: { type: 'integer', example: 2 },
    skippedHabitCount: { type: 'integer', example: 1 },
    missedHabitCount: { type: 'integer', example: 0 },
    habitCompletionRate: { type: 'number', example: 66.7, description: '0–100' },
    avgEfficiencyScore: { type: 'number', nullable: true, example: 105 },
    timeLeaks: { type: 'array', items: TimeleakSchema },
    computedAt: { type: 'string', format: 'date-time' },
  },
};

const GoalBreakdownSchema = {
  type: 'object',
  properties: {
    goalId: { type: 'string' },
    goalTitle: { type: 'string', example: 'Learn TypeScript' },
    minutesLogged: { type: 'integer', example: 120 },
  },
};

const DayMinutesSchema = {
  type: 'object',
  nullable: true,
  properties: {
    date: { type: 'string', example: '2026-05-05', description: 'YYYY-MM-DD' },
    minutes: { type: 'integer', example: 180 },
  },
};

const WeeklyAnalyticsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    weekStart: { type: 'string', example: '2026-05-04', description: 'YYYY-MM-DD — Monday of the week' },
    totalLoggedMinutes: { type: 'number', example: 960 },
    netFocusMinutes: { type: 'number', example: 840 },
    deepWorkMinutes: { type: 'number', example: 480 },
    totalSessions: { type: 'integer', example: 14 },
    totalCompletedTasks: { type: 'integer', example: 22 },
    avgDailyMinutes: { type: 'number', example: 137 },
    bestDay: DayMinutesSchema,
    worstDay: DayMinutesSchema,
    timeLeaksIdentified: { type: 'integer', example: 3 },
    goalBreakdown: { type: 'array', items: GoalBreakdownSchema },
    computedAt: { type: 'string', format: 'date-time' },
  },
};

const MonthlyAnalyticsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    monthStart: { type: 'string', example: '2026-05-01', description: 'YYYY-MM-01' },
    monthEnd: { type: 'string', example: '2026-05-31', description: 'YYYY-MM-DD' },
    totalLoggedMinutes: { type: 'number', example: 4200 },
    netFocusMinutes: { type: 'number', example: 3600 },
    deepWorkMinutes: { type: 'number', example: 2000 },
    totalSessions: { type: 'integer', example: 60 },
    totalCompletedTasks: { type: 'integer', example: 90 },
    avgDailyMinutes: { type: 'number', example: 140 },
    bestDay: DayMinutesSchema,
    worstDay: DayMinutesSchema,
    timeLeaksIdentified: { type: 'integer', example: 12 },
    goalBreakdown: { type: 'array', items: GoalBreakdownSchema },
    computedAt: { type: 'string', format: 'date-time' },
  },
};

const GoalAnalyticsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    goalId: { type: 'string' },
    userId: { type: 'string' },
    goalTitle: { type: 'string', example: 'Learn TypeScript' },
    totalLoggedMinutes: { type: 'number', example: 840 },
    taskCount: { type: 'integer', example: 12 },
    completedTaskCount: { type: 'integer', example: 7 },
    completionPercent: { type: 'number', example: 58, description: '0–100' },
    avgEfficiencyScore: { type: 'number', nullable: true, example: 102 },
    consistencyScore: { type: 'number', example: 75, description: '0–100 — % of last 12 weeks with ≥1 session' },
    weeklyAvgMinutes: { type: 'number', example: 70 },
    projectedCompletionDate: { type: 'string', format: 'date-time', nullable: true, example: '2026-11-15T00:00:00.000Z' },
    isOnTrack: { type: 'boolean', nullable: true, example: true },
    lastComputedAt: { type: 'string', format: 'date-time' },
  },
};

const AccuracyEntrySchema = {
  type: 'object',
  properties: {
    taskId: { type: 'string' },
    date: { type: 'string', format: 'date-time' },
    estimated: { type: 'integer', example: 3600000, description: 'milliseconds' },
    actual: { type: 'integer', example: 3400000, description: 'milliseconds' },
    accuracy: { type: 'integer', example: 106, description: '>100 = finished faster than estimated' },
  },
};

const EstimationProfileSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string' },
    recentAccuracies: { type: 'array', items: AccuracyEntrySchema, description: 'Last 30 completions, newest first' },
    rollingAverage: { type: 'number', nullable: true, example: 103 },
    trend: { type: 'string', enum: ['IMPROVING', 'DECLINING', 'STABLE'], nullable: true, example: 'STABLE' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const DashboardResultSchema = {
  type: 'object',
  properties: {
    today: { ...DailyAnalyticsSchema, nullable: true, description: 'null if no session/task logged today yet' },
    thisWeek: { ...WeeklyAnalyticsSchema, nullable: true, description: 'null if no activity this week yet' },
    goals: { type: 'array', items: GoalAnalyticsSchema },
    estimation: { ...EstimationProfileSchema, nullable: true, description: 'null if no tasks completed yet' },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

/** Validates YYYY-MM-DD format */
function parseDate(raw: string | undefined, label: string): string {
  if (!raw)
    throw new BadRequestException(`Query param '${label}' is required.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new BadRequestException(`'${label}' must be in YYYY-MM-DD format.`);
  }
  return raw;
}

/** Validates YYYY-MM format */
function parseMonth(raw: string | undefined, label: string): string {
  if (!raw)
    throw new BadRequestException(`Query param '${label}' is required.`);
  if (!/^\d{4}-\d{2}$/.test(raw)) {
    throw new BadRequestException(`'${label}' must be in YYYY-MM format.`);
  }
  return raw;
}

@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly getDailyService: GetDailyAnalyticsService,
    private readonly getGoalService: GetGoalAnalyticsService,
    private readonly getWeeklyService: GetWeeklyAnalyticsService,
    private readonly getMonthlyService: GetMonthlyAnalyticsService,
    private readonly getEstimationService: GetEstimationProfileService,
    private readonly getDashboardService: GetDashboardService,
    @Inject(USER_REPO_PORT) private readonly userRepo: IUserRepository,
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Composite dashboard',
    description:
      "Returns today's daily analytics, current week's weekly analytics, all goal analytics, and the estimation accuracy profile in one call. Any section that hasn't been computed yet is returned as null / empty array.",
  })
  @ApiResponse({ status: 200, description: 'Dashboard data returned.', schema: ApiSuccessSchema(DashboardResultSchema) })
  async dashboard(
    @Req() req: Request,
  ): Promise<ApiResponseType<DashboardResult>> {
    const { sub: userId } = req.user as TokenPayload;
    const result = await this.getDashboardService.execute(userId);
    return ok('Dashboard retrieved.', result);
  }

  // ─── Daily ────────────────────────────────────────────────────────────────

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get daily analytics for a specific date',
    description:
      'Returns time metrics, session metrics, task metrics, efficiency score, and detected time leaks. Computed after each session or task completion — reflects the state at last computation.',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    example: '2026-03-01',
    description: 'YYYY-MM-DD',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily analytics returned.',
    schema: ApiSuccessSchema({
      ...DailyAnalyticsSchema,
      properties: {
        ...DailyAnalyticsSchema.properties,
        appStreak: {
          type: 'object',
          properties: {
            current: { type: 'integer', example: 7, description: 'Consecutive active days. 0 if streak is broken.' },
            longest: { type: 'integer', example: 21, description: 'All-time longest streak.' },
            lastActiveDate: { type: 'string', format: 'date', example: '2026-05-10', nullable: true },
          },
        },
      },
    }),
  })
  @ApiResponse({ status: 404, description: 'No analytics found for this date.' })
  async getDaily(
    @Req() req: Request,
    @Query('date') dateStr?: string,
  ): Promise<ApiResponseType<object>> {
    const { sub: userId } = req.user as TokenPayload;
    const date = parseDate(dateStr, 'date');

    const [analytics, user] = await Promise.all([
      this.getDailyService.getByDate(userId, date),
      this.userRepo.findById(userId),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = (() => {
      const d = new Date(`${today}T00:00:00.000Z`);
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    })();
    const raw = user?.appStreak ?? { current: 0, longest: 0, lastActiveDate: null };
    const isLive = raw.lastActiveDate === today || raw.lastActiveDate === yesterday;
    const appStreak: AppStreak = {
      current: isLive ? raw.current : 0,
      longest: raw.longest,
      lastActiveDate: raw.lastActiveDate,
    };

    return ok('Daily analytics retrieved.', { ...analytics, appStreak });
  }

  @Get('daily/range')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get daily analytics for a date range',
    description:
      'Returns an ordered array of daily analytics documents. Useful for rendering a heatmap or trend chart. Missing days (no logged activity) are simply absent from the array.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    example: '2026-02-01',
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    example: '2026-03-01',
    description: 'YYYY-MM-DD',
  })
  @ApiResponse({ status: 200, description: 'Date range analytics returned.', schema: ApiSuccessSchema({ type: 'array', items: DailyAnalyticsSchema }) })
  async getDailyRange(
    @Req() req: Request,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ): Promise<ApiResponseType<DailyAnalytics[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const startDate = parseDate(startDateStr, 'startDate');
    const endDate = parseDate(endDateStr, 'endDate');
    const analytics = await this.getDailyService.getRange(
      userId,
      startDate,
      endDate,
    );
    return ok('Date range analytics retrieved.', analytics);
  }

  // ─── Weekly ───────────────────────────────────────────────────────────────

  @Get('weekly')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get weekly analytics for a specific week',
    description:
      'Provide the Monday date of the desired week. Weekly analytics are derived from daily analytics when requested.',
  })
  @ApiQuery({
    name: 'weekStart',
    required: true,
    example: '2026-02-23',
    description: 'YYYY-MM-DD — Monday of the target week',
  })
  @ApiResponse({ status: 200, description: 'Weekly analytics returned.', schema: ApiSuccessSchema(WeeklyAnalyticsSchema) })
  @ApiResponse({
    status: 404,
    description: 'No analytics found for this week.',
  })
  async getWeekly(
    @Req() req: Request,
    @Query('weekStart') weekStartStr?: string,
  ): Promise<ApiResponseType<WeeklyAnalytics>> {
    const { sub: userId } = req.user as TokenPayload;
    const weekStart = parseDate(weekStartStr, 'weekStart');
    const analytics = await this.getWeeklyService.getByWeek(userId, weekStart);
    return ok('Weekly analytics retrieved.', analytics);
  }

  @Get('weekly/recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the most recent weekly summaries',
    description:
      'Returns up to `limit` weekly analytics documents, newest first. Default limit is 8 (two months).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 8,
    description: 'Max number of weeks to return (default 8)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent weekly analytics returned.',
    schema: ApiSuccessSchema({ type: 'array', items: WeeklyAnalyticsSchema }),
  })
  async getRecentWeekly(
    @Req() req: Request,
    @Query('limit') limitStr?: string,
  ): Promise<ApiResponseType<WeeklyAnalytics[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const limit = limitStr
      ? Math.min(52, Math.max(1, parseInt(limitStr, 10)))
      : 8;
    const analytics = await this.getWeeklyService.getRecent(userId, limit);
    return ok('Recent weekly analytics retrieved.', analytics);
  }

  // ─── Monthly ──────────────────────────────────────────────────────────────

  @Get('monthly')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get monthly analytics for a specific month',
    description:
      'Provide the YYYY-MM month key. Monthly analytics are derived from daily analytics when requested.',
  })
  @ApiQuery({
    name: 'month',
    required: true,
    example: '2026-03',
    description: 'YYYY-MM',
  })
  @ApiResponse({ status: 200, description: 'Monthly analytics returned.', schema: ApiSuccessSchema(MonthlyAnalyticsSchema) })
  @ApiResponse({
    status: 404,
    description: 'No analytics found for this month.',
  })
  async getMonthly(
    @Req() req: Request,
    @Query('month') monthStr?: string,
  ): Promise<ApiResponseType<MonthlyAnalytics>> {
    const { sub: userId } = req.user as TokenPayload;
    const month = parseMonth(monthStr, 'month');
    const analytics = await this.getMonthlyService.getByMonth(userId, month);
    return ok('Monthly analytics retrieved.', analytics);
  }

  @Get('monthly/recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get the most recent monthly summaries',
    description:
      'Returns up to `limit` monthly analytics documents, newest first. Default limit is 6.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 6,
    description: 'Max number of months to return (default 6)',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent monthly analytics returned.',
    schema: ApiSuccessSchema({ type: 'array', items: MonthlyAnalyticsSchema }),
  })
  async getRecentMonthly(
    @Req() req: Request,
    @Query('limit') limitStr?: string,
  ): Promise<ApiResponseType<MonthlyAnalytics[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const limit = limitStr
      ? Math.min(24, Math.max(1, parseInt(limitStr, 10)))
      : 6;
    const analytics = await this.getMonthlyService.getRecent(userId, limit);
    return ok('Recent monthly analytics retrieved.', analytics);
  }

  // ─── Goals ────────────────────────────────────────────────────────────────

  @Get('goals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get analytics for all goals of the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Goal analytics list returned.', schema: ApiSuccessSchema({ type: 'array', items: GoalAnalyticsSchema }) })
  async getAllGoals(
    @Req() req: Request,
  ): Promise<ApiResponseType<GoalAnalytics[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const analytics = await this.getGoalService.getAllForUser(userId);
    return ok('Goal analytics retrieved.', analytics);
  }

  @Get('goals/:goalId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get analytics for a specific goal',
    description:
      'Includes total logged minutes, efficiency, consistency score (% of last 12 weeks with ≥1 session), and a projected completion date based on current pacing.',
  })
  @ApiParam({ name: 'goalId', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Goal analytics returned.', schema: ApiSuccessSchema(GoalAnalyticsSchema) })
  @ApiResponse({
    status: 404,
    description: 'No analytics found for this goal.',
  })
  async getGoal(
    @Param('goalId') goalId: string,
  ): Promise<ApiResponseType<GoalAnalytics>> {
    const analytics = await this.getGoalService.getByGoalId(goalId);
    return ok('Goal analytics retrieved.', analytics);
  }

  // ─── Estimation ───────────────────────────────────────────────────────────

  @Get('estimation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get estimation accuracy profile',
    description:
      'Returns the last 30 task completions with estimated vs actual duration, a rolling average accuracy score (>100 = consistently finishing faster, <100 = consistently over-running), and a trend (IMPROVING / DECLINING / STABLE).',
  })
  @ApiResponse({ status: 200, description: 'Estimation profile returned.', schema: ApiSuccessSchema(EstimationProfileSchema) })
  @ApiResponse({
    status: 404,
    description: 'No profile yet — complete at least one task.',
  })
  async getEstimation(
    @Req() req: Request,
  ): Promise<ApiResponseType<EstimationProfile>> {
    const { sub: userId } = req.user as TokenPayload;
    const profile = await this.getEstimationService.getForUser(userId);
    return ok('Estimation profile retrieved.', profile);
  }
}
