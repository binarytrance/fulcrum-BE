import { Module } from '@nestjs/common';
import { ConfigModule } from '@shared/config/config.module';
import { ConfigService } from '@shared/config/config.service';
import { EMAIL_PORT } from '@shared/domain/ports/email.port';
import { ResendEmailSender } from '@shared/infrastructure/email/resend-email.sender';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_PORT,
      useFactory: (config: ConfigService) => {
        return new ResendEmailSender(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_PORT],
})
export class MailModule {}
