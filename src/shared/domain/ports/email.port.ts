export const EMAIL_PORT = Symbol('EMAIL_PORT');

export type EmailType = 'verification' | 'password-reset';

export interface IEmailSender {
  send(email: string, token: string | null, type?: EmailType): Promise<void>;
}
