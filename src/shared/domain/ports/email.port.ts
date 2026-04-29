export const EMAIL_PORT = Symbol('EMAIL_PORT');

export enum EmailType {
  VERIFICATION = 'verification',
  PASSWORD_RESET = 'password-reset',
}

export interface IEmailSender {
  send(email: string, token: string | null, type?: EmailType): Promise<void>;
}
