import type { TaskCompletedEvent } from '@tasks/domain/events/task-completed.event';

export type TaskEvent = TaskCompletedEvent;

export const TASK_EVENT_PUBLISHER_PORT = Symbol('TASK_EVENT_PUBLISHER_PORT');

export interface ITaskEventPublisher {
  publish(event: TaskEvent): Promise<void>;
}
