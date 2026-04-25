import { Inject, Injectable } from '@nestjs/common';
import {
  ANALYTICS_EVENT_PUBLISHER_PORT,
  type IAnalyticsEventPublisher,
} from '@analytics/domain/ports/analytics-event-publisher.port';
import {
  DAILY_ANALYTICS_REPO_PORT,
  type IDailyAnalyticsRepository,
} from '@analytics/domain/ports/daily-analytics-repo.port';
import {
  GOAL_ANALYTICS_REPO_PORT,
  type IGoalAnalyticsRepository,
} from '@analytics/domain/ports/goal-analytics-repo.port';
import {
  ESTIMATION_PROFILE_REPO_PORT,
  type IEstimationProfileRepository,
} from '@analytics/domain/ports/estimation-profile-repo.port';
import type { DailyAnalytics } from '@analytics/domain/entities/daily-analytics.entity';
import type { WeeklyAnalytics } from '@analytics/domain/entities/weekly-analytics.entity';
import type { GoalAnalytics } from '@analytics/domain/entities/goal-analytics.entity';
import type { EstimationProfile } from '@analytics/domain/entities/estimation-profile.entity';
import { GetWeeklyAnalyticsService } from '@analytics/application/services/get-weekly-analytics.service';

/** Returns the YYYY-MM-DD string of the Monday that starts the current ISO week. */
function currentWeekStart(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface DashboardResult {
  /** May be null if no session/task logged today yet */
  today: DailyAnalytics | null;
  /** May be null if there is no daily activity for the current week yet */
  thisWeek: WeeklyAnalytics | null;
  /** One entry per goal — empty array if none computed yet */
  goals: GoalAnalytics[];
  /** null if no tasks completed yet */
  estimation: EstimationProfile | null;
}

@Injectable()
export class GetDashboardService {
  constructor(
    @Inject(DAILY_ANALYTICS_REPO_PORT)
    private readonly dailyRepo: IDailyAnalyticsRepository,
    private readonly weeklyService: GetWeeklyAnalyticsService,

    @Inject(GOAL_ANALYTICS_REPO_PORT)
    private readonly goalRepo: IGoalAnalyticsRepository,

    @Inject(ESTIMATION_PROFILE_REPO_PORT)
    private readonly estimationRepo: IEstimationProfileRepository,

    @Inject(ANALYTICS_EVENT_PUBLISHER_PORT)
    private readonly analyticsEventPublisher: IAnalyticsEventPublisher,
  ) {}

  async execute(userId: string): Promise<DashboardResult> {
    const weekStart = currentWeekStart();
    const [today, thisWeek, goals, estimation] = await Promise.all([
      this.dailyRepo.findByUserAndDate(userId, todayDate()),
      this.weeklyService.getByWeekOrNull(userId, weekStart),
      this.goalRepo.findByUserId(userId),
      this.estimationRepo.findByUserId(userId),
    ]);

    // Bootstrap: if no daily doc exists for today yet, enqueue a fresh compute so the
    // next dashboard poll (after ~1-2 s) will return real data instead of null.
    if (!today) {
      void this.analyticsEventPublisher.queueDailyCompute(userId, todayDate());
    }

    return { today, thisWeek, goals, estimation };
  }
}
