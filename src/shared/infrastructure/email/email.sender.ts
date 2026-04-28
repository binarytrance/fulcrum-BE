import { ConfigService } from '@shared/config/config.service';
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { IEmailSender } from '@shared/domain/ports/email.port';

@Injectable()
export class NodeMailerEmailSender implements IEmailSender {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(NodeMailerEmailSender.name);

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.config.email.senderEmail,
        pass: this.config.email.senderEmailPassword,
      },
    });
  }

  async send(email: string, token: string | null, type: import('@shared/domain/ports/email.port').EmailType = 'verification'): Promise<void> {
    const isReset = type === 'password-reset';
    const subject = isReset ? 'Password Reset' : 'Email Verification';
    const text = isReset
      ? `Your password reset token is: ${token}`
      : `Your verification token is: ${token}`;
    const html = isReset
      ? `<p>Your password reset token is: <strong>${token}</strong></p>`
      : `<p>Your verification token is: <strong>${token}</strong></p>`;

    try {
      await this.transporter.sendMail({
        from: this.config.email.senderEmail,
        to: email,
        subject,
        text,
        html,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      throw new Error(`Failed to send email: ${error}`);
    }
  }
}
