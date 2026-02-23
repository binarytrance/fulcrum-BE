import { SignupEmailEvent } from '../events/signup-email.event';

export const EVENT_PUBLISHER_PORT = Symbol('EVENT_PUBLISHER_PORT');

export interface IEventPublisher {
  publish(event: SignupEmailEvent): Promise<void>;
}
