import type { GoalDeadlineChangedEvent } from '@goals/domain/events/goal-deadline-changed.event';
import type { GoalProgressRecomputeEvent } from '@goals/domain/events/goal-progress-recompute.event';

export type GoalEvent = GoalDeadlineChangedEvent | GoalProgressRecomputeEvent;

export const GOAL_EVENT_PUBLISHER_PORT = Symbol('GOAL_EVENT_PUBLISHER_PORT');

export interface IGoalEventPublisher {
  publish(event: GoalEvent): Promise<void>;
}
