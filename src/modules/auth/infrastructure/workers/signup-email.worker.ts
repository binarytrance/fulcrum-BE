import { WorkerHost, Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAIL_PORT } from '@shared/domain/ports/email.port';
import type { IEmailSender } from '@shared/domain/ports/email.port';
import { AuthJobPayloads, AuthJobs } from '@auth/domain/types/auth-jobs.types';

@Processor('email')
@Injectable()
export class SignupEmailWorker extends WorkerHost {
  private readonly logger = new Logger(SignupEmailWorker.name);

  constructor(@Inject(EMAIL_PORT) private readonly emailSender: IEmailSender) {
    super();
  }

  async process(
    job: Job<AuthJobPayloads[AuthJobs.SEND_SIGNUP_VERIFICATION]>,
  ): Promise<{ delivered: boolean } | null> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    if (job.name === (AuthJobs.SEND_SIGNUP_VERIFICATION as string)) {
      this.logger.log(
        `job data - email: ${job.data.email}, token: ${job.data.verificationToken}`,
      );
      const { email, verificationToken } = job.data;
      await this.emailSender.send(email, verificationToken);
      this.logger.log(`Verification email sent to ${email}`);
      return { delivered: true };
    }

    this.logger.warn(`Unknown job name: ${job.name}`);
    return null;
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.log('signup email worker connected');
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(`Job failed: ${job.id}`, job.failedReason);
  }
}
