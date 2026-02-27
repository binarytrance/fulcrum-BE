import type { SessionCompletedEvent } from '@sessions/domain/events/session-completed.event';

export const SESSION_EVENT_PUBLISHER_PORT = Symbol(
  'SESSION_EVENT_PUBLISHER_PORT',
);

export interface ISessionEventPublisher {
  publishSessionCompleted(event: SessionCompletedEvent): Promise<void>;
}
