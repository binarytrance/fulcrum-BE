import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Goal } from '@goals/domain/entities/goal.entity';
import {
  GOAL_REPO_PORT,
  type IGoalRepository,
} from '@goals/domain/ports/goal-repo.port';
import {
  GOAL_EVENT_PUBLISHER_PORT,
  type IGoalEventPublisher,
} from '@goals/domain/ports/goal-event-publisher.port';
import { GoalEstimatedEndDateChangedEvent } from '@goals/domain/events/goal-deadline-changed.event';
import {
  GoalCategory,
  GoalPriority,
  GoalStatus,
} from '@goals/domain/types/goal.types';
import {
  APP_STREAK_EVENT_PUBLISHER_PORT,
  type IAppStreakEventPublisher,
} from '@users/domain/ports/app-streak-event-publisher.port';
import {
  GOAL_CACHE_PORT,
  type IGoalCachePort,
} from '@goals/domain/ports/goal-cache.port';

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  category?: GoalCategory;
  status?: GoalStatus;
  priority?: GoalPriority;
  /** Planned end date for the goal; pass null to clear it */
  estimatedEndDate?: Date | null;
  /** Estimated duration in milliseconds; pass null to clear it */
  estimatedDuration?: number | null;
  /** When the user plans to start the goal; pass null to clear it */
  estimatedStartDate?: Date | null;
  /** Actual date the goal was started; pass null to clear it */
  actualStartDate?: Date | null;
  /** Date the goal was completed or abandoned; pass null to clear it */
  actualEndDate?: Date | null;
}

@Injectable()
export class UpdateGoalService {
  constructor(
    @Inject(GOAL_REPO_PORT)
    private readonly goalRepo: IGoalRepository,
    @Inject(GOAL_EVENT_PUBLISHER_PORT)
    private readonly goalEventPublisher: IGoalEventPublisher,
    @Inject(GOAL_CACHE_PORT)
    private readonly goalCache: IGoalCachePort,
    @Inject(APP_STREAK_EVENT_PUBLISHER_PORT)
    private readonly appStreakPublisher: IAppStreakEventPublisher,
  ) {}

  async execute(
    goalId: string,
    userId: string,
    input: UpdateGoalInput,
  ): Promise<Goal> {
    const goal = await this.goalRepo.findById(goalId);
    if (!goal) throw new NotFoundException('Goal not found.');
    if (goal.userId !== userId) throw new ForbiddenException('Access denied.');

    const estimatedEndDateChanged =
      input.estimatedEndDate !== undefined &&
      input.estimatedEndDate?.getTime() !== goal.estimatedEndDate?.getTime();

    if (estimatedEndDateChanged && input.estimatedEndDate) {
      const newDeadline = input.estimatedEndDate;

      // Sub-goal: new deadline must not exceed parent's deadline
      if (goal.parentGoalId) {
        const parent = await this.goalRepo.findById(goal.parentGoalId);
        if (parent?.estimatedEndDate && newDeadline > parent.estimatedEndDate) {
          throw new BadRequestException(
            `Deadline cannot exceed the parent goal's deadline (${parent.estimatedEndDate.toISOString().slice(0, 10)}).`,
          );
        }
      }

      // Parent goal: new deadline must not be earlier than any child's deadline
      const allGoals = await this.goalRepo.findAllByUserId(userId);
      const children = allGoals.filter((g) => g.parentGoalId === goalId);
      const violating = children.find(
        (c) => c.estimatedEndDate && c.estimatedEndDate > newDeadline,
      );
      if (violating) {
        throw new BadRequestException(
          `Cannot set deadline earlier than sub-goal "${violating.title}" ` +
            `(${violating.estimatedEndDate!.toISOString().slice(0, 10)}). ` +
            'Update or remove the sub-goal deadline first.',
        );
      }
    }

    // entity.update() enforces the status transition state machine
    const updated = goal.update(input);
    await this.goalRepo.update(updated);
    await this.goalCache.invalidate(userId);

    if (input.status === GoalStatus.COMPLETED) {
      await this.appStreakPublisher.publishActivityRecorded(
        userId,
        new Date().toISOString().slice(0, 10),
      );
    }

    if (estimatedEndDateChanged) {
      // Fire-and-forget: AI pacing recalculation runs asynchronously
      await this.goalEventPublisher.publish(
        new GoalEstimatedEndDateChangedEvent(
          goalId,
          userId,
          input.estimatedEndDate ?? null,
        ),
      );
    }

    return updated;
  }
}
