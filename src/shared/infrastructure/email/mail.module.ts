import { Module } from '@nestjs/common';
import { ConfigModule } from '@shared/config/config.module';
import { ConfigService } from '@shared/config/config.service';
import { EMAIL_PORT } from '@shared/domain/ports/email.port';
import { NodeMailerEmailSender } from '@shared/infrastructure/email/email.sender';
import { SendGridEmailSender } from '@shared/infrastructure/email/sendgrid-email.sender';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_PORT,
      useFactory: (config: ConfigService) => {
        return config.isProd
          ? new SendGridEmailSender(config)
          : new NodeMailerEmailSender(config);
      },
      inject: [ConfigService],
    },
  ],
  exports: [EMAIL_PORT],
})
export class MailModule {}