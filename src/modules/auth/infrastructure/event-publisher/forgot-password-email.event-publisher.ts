import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ForgotPasswordEmailEvent } from '@auth/domain/events/forgot-password-email.event';
import { IForgotPasswordEventPublisher } from '@auth/domain/ports/forgot-password-event-publisher.port';
import { AuthJobPayloads, AuthJobs } from '@auth/domain/types/auth-jobs.types';

@Injectable()
export class ForgotPasswordEmailEventPublisher implements IForgotPasswordEventPublisher {
  private readonly logger = new Logger('ForgotPasswordEventPublisher');

  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue<
      AuthJobPayloads[AuthJobs.SEND_FORGOT_PASSWORD]
    >,
  ) {}

  async publish(event: ForgotPasswordEmailEvent): Promise<void> {
    if (event instanceof ForgotPasswordEmailEvent) {
      this.logger.log(
        `data is: email - ${event.email}, token - ${event.resetToken}`,
      );
      await this.emailQueue.add(AuthJobs.SEND_FORGOT_PASSWORD, {
        email: event.email,
        resetToken: event.resetToken,
      });
    }
  }
}
