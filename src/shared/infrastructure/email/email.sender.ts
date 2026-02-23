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
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: this.config.email.senderEmail,
        pass: this.config.email.senderEmailPassword,
      },
    });
  }

  async send(email: string, token: string | null): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.email.senderEmail,
        to: email,
        subject: 'Email Verification',
        text: `Your verification token is: ${token}`,
        html: `<p>Your verification token is: <strong>${token}</strong></p>`,
      });
      this.logger.log(
        `Verification email sent to ${email} with token ${token}`,
      );
    } catch (error) {
      throw new Error(`Failed to send email: ${error}`);
    }
  }
}
