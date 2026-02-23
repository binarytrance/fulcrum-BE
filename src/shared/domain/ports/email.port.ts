export const EMAIL_PORT = Symbol('EMAIL_PORT');

export interface IEmailSender {
  send(email: string, token: string | null): Promise<void>;
}
