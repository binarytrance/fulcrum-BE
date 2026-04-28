/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { IEmailSender } from '@shared/domain/ports/email.port';
import { ConfigService } from '@shared/config/config.service';

@Injectable()
export class ResendEmailSender implements IEmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly client: Resend;

  constructor(private readonly config: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.client = new Resend(this.config.email.resendApiKey);
  }

  async send(email: string, token: string | null): Promise<void> {
    if (!this.config.email.resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const fromAddress =
      this.config.email.resendSender || this.config.email.senderEmail;

    if (!fromAddress) {
      throw new Error('RESEND_SENDER or SENDER_EMAIL must be configured');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await this.client.emails.send({
        from: fromAddress,
        to: email,
        subject: 'Email Verification',
        text: `Your verification token is: ${token}`,
        html: `<p>Your verification token is: <strong>${token}</strong></p>`,
      });

      // Resend returns { data, error } and does not always throw on API errors.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (result?.error) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const resendError = result.error;
        throw new Error(
          `Resend rejected email: ${JSON.stringify(resendError)}`,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
