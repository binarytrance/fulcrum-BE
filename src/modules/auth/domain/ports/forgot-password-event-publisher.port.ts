import { ForgotPasswordEmailEvent } from '@auth/domain/events/forgot-password-email.event';

export const FORGOT_PASSWORD_EVENT_PUBLISHER_PORT = Symbol(
  'FORGOT_PASSWORD_EVENT_PUBLISHER_PORT',
);

export interface IForgotPasswordEventPublisher {
  publish(event: ForgotPasswordEmailEvent): Promise<void>;
}
