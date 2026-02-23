import { Module } from '@nestjs/common';
import { ConfigModule } from '@shared/config/config.module';
import { EMAIL_PORT } from '@shared/domain/ports/email.port';
import { NodeMailerEmailSender } from '@shared/infrastructure/email/email.sender';

@Module({
  imports: [ConfigModule],
  providers: [{ provide: EMAIL_PORT, useClass: NodeMailerEmailSender }],
  exports: [EMAIL_PORT],
})
export class MailModule {}
