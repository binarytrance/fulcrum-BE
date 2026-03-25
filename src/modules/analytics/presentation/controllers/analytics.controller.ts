import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { GetEstimationProfileService } from '@analytics/application/services/get-estimation-profile.service';
import { GetDashboardService } from '@analytics/application/services/get-dashboard.service';

import {
  ok,
  type ApiResponse as ApiResponseType,
} from '@shared/presentation/responses/api-response';

import type { DailyAnalytics } from '@analytics/domain/entities/daily-analytics.entity';
import type { GoalAnalytics } from '@analytics/domain/entities/goal-analytics.entity';
import type { WeeklyAnalytics } from '@analytics/domain/entities/weekly-analytics.entity';
import type { EstimationProfile } from '@analytics/domain/entities/estimation-profile.entity';
import type { DashboardResult } from '@analytics/application/services/get-dashboard.service';

/** Validates YYYY-MM-DD format */
function parseDate(raw: string | undefined, label: string): string {
  if (!raw)
    throw new BadRequestException(`Query param '${label}' is required.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new BadRequestException(`'${label}' must be in YYYY-MM-DD format.`);
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
    private readonly getEstimationService: GetEstimationProfileService,
    private readonly getDashboardService: GetDashboardService,
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Composite dashboard',
    description:
      "Returns today's daily analytics, current week's weekly analytics, all goal analytics, and the estimation accuracy profile in one call. Any section that hasn't been computed yet is returned as null / empty array.",
  })
  @ApiResponse({ status: 200, description: 'Dashboard data returned.' })
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
  @ApiResponse({ status: 200, description: 'Daily analytics returned.' })
  @ApiResponse({
    status: 404,
    description: 'No analytics found for this date.',
  })
  async getDaily(
    @Req() req: Request,
    @Query('date') dateStr?: string,
  ): Promise<ApiResponseType<DailyAnalytics>> {
    const { sub: userId } = req.user as TokenPayload;
    const date = parseDate(dateStr, 'date');
    const analytics = await this.getDailyService.getByDate(userId, date);
    return ok('Daily analytics retrieved.', analytics);
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
  @ApiResponse({ status: 200, description: 'Date range analytics returned.' })
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
      'Provide the Monday date of the desired week. Weekly analytics are computed every Sunday at 23:00 UTC.',
  })
  @ApiQuery({
    name: 'weekStart',
    required: true,
    example: '2026-02-23',
    description: 'YYYY-MM-DD — Monday of the target week',
  })
  @ApiResponse({ status: 200, description: 'Weekly analytics returned.' })
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

  // ─── Goals ────────────────────────────────────────────────────────────────

  @Get('goals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get analytics for all goals of the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Goal analytics list returned.' })
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
  @ApiResponse({ status: 200, description: 'Goal analytics returned.' })
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
  @ApiResponse({ status: 200, description: 'Estimation profile returned.' })
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
