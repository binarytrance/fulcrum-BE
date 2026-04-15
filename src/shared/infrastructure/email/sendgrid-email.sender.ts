import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { IEmailSender } from '@shared/domain/ports/email.port';
import { ConfigService } from '@shared/config/config.service';

@Injectable()
export class SendGridEmailSender implements IEmailSender {
  private readonly logger = new Logger(SendGridEmailSender.name);

  constructor(private readonly config: ConfigService) {
    sgMail.setApiKey(this.config.email.sendgridApiKey);
  }

  async send(email: string, token: string | null): Promise<void> {
    try {
      await sgMail.send({
        from: this.config.email.sendgridSender,
        to: email,
        subject: 'Email Verification',
        text: `Your verification token is: ${token}`,
        html: `<p>Your verification token is: <strong>${token}</strong></p>`,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      throw new Error(`Failed to send email: ${error}`);
    }
  }
}