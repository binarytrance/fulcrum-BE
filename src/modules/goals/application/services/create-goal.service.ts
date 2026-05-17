import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ANALYTICS_EVENT_PUBLISHER_PORT,
  type IAnalyticsEventPublisher,
} from '@analytics/domain/ports/analytics-event-publisher.port';
import {
  APP_STREAK_EVENT_PUBLISHER_PORT,
  type IAppStreakEventPublisher,
} from '@users/domain/ports/app-streak-event-publisher.port';
import { Goal } from '@goals/domain/entities/goal.entity';
import {
  GOAL_REPO_PORT,
  type IGoalRepository,
} from '@goals/domain/ports/goal-repo.port';
import {
  GoalCategory,
  GoalPriority,
  GoalStatus,
} from '@goals/domain/types/goal.types';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import {
  GOAL_CACHE_PORT,
  type IGoalCachePort,
} from '@goals/domain/ports/goal-cache.port';

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  priority?: GoalPriority;
  /** Planned end date for the goal (millisecond-precision Date) */
  estimatedEndDate?: Date;
  /** Estimated duration to complete this goal, in milliseconds */
  estimatedDuration?: number;
  /** When the user plans to start the goal; omit if not set */
  estimatedStartDate?: Date;
  /** Date the goal was completed or abandoned; omit if still in progress */
  actualEndDate?: Date;
  /** If provided, this goal becomes a sub-goal of the given parent */
  parentGoalId?: string;
}

@Injectable()
export class CreateGoalService {
  constructor(
    @Inject(GOAL_REPO_PORT)
    private readonly goalRepo: IGoalRepository,
    @Inject(ID_GENERATOR_PORT)
    private readonly idGenerator: IIDGenerator,
    @Inject(GOAL_CACHE_PORT)
    private readonly goalCache: IGoalCachePort,
    @Inject(ANALYTICS_EVENT_PUBLISHER_PORT)
    private readonly analyticsEventPublisher: IAnalyticsEventPublisher,
    @Inject(APP_STREAK_EVENT_PUBLISHER_PORT)
    private readonly appStreakPublisher: IAppStreakEventPublisher,
  ) {}

  async execute(input: CreateGoalInput): Promise<Goal> {
    let level: 1 | 2 | 3 = 1;

    if (input.parentGoalId) {
      const parent = await this.goalRepo.findById(input.parentGoalId);
      if (!parent) throw new NotFoundException('Parent goal not found.');
      if (parent.userId !== input.userId)
        throw new NotFoundException('Parent goal not found.');
      if (parent.level >= 3) {
        throw new BadRequestException(
          'Goal nesting limit reached. Sub-goals can only be nested up to 3 levels deep.',
        );
      }
      level = (parent.level + 1) as 2 | 3;

      if (input.estimatedEndDate && parent.estimatedEndDate) {
        if (input.estimatedEndDate > parent.estimatedEndDate) {
          throw new BadRequestException(
            `Sub-goal deadline (${input.estimatedEndDate.toISOString().slice(0, 10)}) cannot exceed ` +
              `the parent goal's deadline (${parent.estimatedEndDate.toISOString().slice(0, 10)}).`,
          );
        }
      }
    }

    // Goal.create() initialises progress with all zeros automatically.
    // actualStartDate is always null at creation — it is auto-set by Goal.update()
    // when the goal transitions to ACTIVE for the first time.

    if (input.estimatedDuration && input.estimatedEndDate) {
      const now = Date.now();
      const availableMs = input.estimatedEndDate.getTime() - now;
      if (input.estimatedDuration > availableMs) {
        const availableHours = (availableMs / 3_600_000).toFixed(1);
        const requiredHours = (input.estimatedDuration / 3_600_000).toFixed(1);
        throw new BadRequestException(
          `Goal requires ${requiredHours}h but only ${availableHours}h remain before the deadline. ` +
            'Please extend the deadline or reduce the estimated duration.',
        );
      }
    }
    const goal = Goal.create({
      id: this.idGenerator.generate(),
      userId: input.userId,
      parentGoalId: input.parentGoalId ?? null,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      status: GoalStatus.ACTIVE,
      priority: input.priority ?? GoalPriority.MEDIUM,
      estimatedEndDate: input.estimatedEndDate ?? null,
      estimatedDuration: input.estimatedDuration ?? null,
      estimatedStartDate: input.estimatedStartDate ?? null,
      actualStartDate: null,
      actualEndDate: input.actualEndDate ?? null,
      level,
    });

    await this.goalRepo.create(goal);
    await this.goalCache.invalidate(input.userId);
    await this.appStreakPublisher.publishActivityRecorded(
      input.userId,
      new Date().toISOString().slice(0, 10),
    );
    // Seed a zero-valued goal analytics doc so the goal appears on the dashboard immediately.
    await this.analyticsEventPublisher.queueGoalInit(
      input.userId,
      goal.id,
      goal.title,
    );
    return goal;
  }
}
