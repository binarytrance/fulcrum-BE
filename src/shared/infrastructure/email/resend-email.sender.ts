import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { IEmailSender, EmailType } from '@shared/domain/ports/email.port';
import { ConfigService } from '@shared/config/config.service';
import {
  verificationEmailHtml,
  verificationEmailText,
  passwordResetEmailHtml,
  passwordResetEmailText,
} from '@shared/infrastructure/email/email.templates';

@Injectable()
export class ResendEmailSender implements IEmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private _client: Resend | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Resend {
    if (!this._client) {
      this._client = new Resend(this.config.email.resendApiKey);
    }
    return this._client;
  }

  async send(
    email: string,
    token: string | null,
    type: EmailType = EmailType.VERIFICATION,
  ): Promise<void> {
    if (!this.config.email.resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const fromAddress =
      this.config.email.resendSender || this.config.email.senderEmail;

    if (!fromAddress) {
      throw new Error('RESEND_SENDER or SENDER_EMAIL must be configured');
    }

    const safeToken = token ?? '';
    const isReset = type === EmailType.PASSWORD_RESET;
    const subject = isReset
      ? 'Reset your Fulcrum password'
      : 'Verify your Fulcrum email';
    const text = isReset
      ? passwordResetEmailText(safeToken)
      : verificationEmailText(safeToken);
    const html = isReset
      ? passwordResetEmailHtml(safeToken)
      : verificationEmailHtml(safeToken);

    try {
      const result = await this.getClient().emails.send({
        from: fromAddress,
        to: email,
        subject,
        text,
        html,
      });

      // Resend returns { data, error } and does not always throw on API errors.
      if (result?.error) {
        const resendError = result.error;
        throw new Error(
          `Resend rejected email: ${JSON.stringify(resendError)}`,
        );
      }

      const messageId = result?.data?.id ?? 'unknown';
      this.logger.log(
        `Verification email accepted by Resend for ${email} (id=${messageId})`,
      );
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw new Error(`Failed to send email: ${String(error)}`);
    }
  }
}
