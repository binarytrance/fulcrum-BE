import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SignupEmailEvent } from '@auth/domain/events/signup-email.event';
import { IEventPublisher } from '@auth/domain/ports/event-publisher.port';
import { AuthJobPayloads, AuthJobs } from '@auth/domain/types/auth-jobs.types';

@Injectable()
export class SignupEmailEventPublisher implements IEventPublisher {
  private readonly logger = new Logger('Event Publisher');

  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue<
      AuthJobPayloads[AuthJobs.SEND_SIGNUP_VERIFICATION]
    >,
  ) {}

  async publish(event: SignupEmailEvent): Promise<void> {
    if (event instanceof SignupEmailEvent) {
      this.logger.log(
        `data is: email - ${event.email}, token - ${event.verificationToken}`,
      );
      await this.emailQueue.add(AuthJobs.SEND_SIGNUP_VERIFICATION, {
        email: event.email,
        verificationToken: event.verificationToken,
      });
    }
  }
}
