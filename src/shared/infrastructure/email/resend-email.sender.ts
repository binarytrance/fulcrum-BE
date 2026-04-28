import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { IEmailSender } from '@shared/domain/ports/email.port';
import { ConfigService } from '@shared/config/config.service';

@Injectable()
export class ResendEmailSender implements IEmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly client: Resend;

  constructor(private readonly config: ConfigService) {
    this.client = new Resend(this.config.email.resendApiKey);
  }

  async send(
    email: string,
    token: string | null,
    type: import('@shared/domain/ports/email.port').EmailType = 'verification',
  ): Promise<void> {
    if (!this.config.email.resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const fromAddress =
      this.config.email.resendSender || this.config.email.senderEmail;

    if (!fromAddress) {
      throw new Error('RESEND_SENDER or SENDER_EMAIL must be configured');
    }

    const isReset = type === 'password-reset';
    const subject = isReset ? 'Password Reset' : 'Email Verification';
    const text = isReset
      ? `Your password reset token is: ${token}`
      : `Your verification token is: ${token}`;
    const html = isReset
      ? `<p>Your password reset token is: <strong>${token}</strong></p>`
      : `<p>Your verification token is: <strong>${token}</strong></p>`;

    try {
      const result = await this.client.emails.send({
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
