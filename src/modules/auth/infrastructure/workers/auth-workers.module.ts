import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { SignupEmailWorker } from '@auth/infrastructure/workers/signup-email.worker';
import { MailModule } from '@shared/infrastructure/email/mail.module';

@Module({
  imports: [
    MailModule,
    BullModule.registerQueue({ name: 'email' }),
    BullBoardModule.forFeature({ name: 'email', adapter: BullMQAdapter }),
  ],
  providers: [SignupEmailWorker],
  exports: [BullModule],
})
export class AuthWorkersModule {}
