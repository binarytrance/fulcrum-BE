import { Module } from '@nestjs/common';
import { ID_GENERATOR_PORT } from '@shared/domain/ports/id-generator.port';
import { UUIDGenerator } from '@shared/infrastructure/security/uuid-generator';
import { MongoModule } from '@shared/infrastructure/persistence/mongo.module';
import { ConfigModule } from '@shared/config/config.module';
import { BullModule } from '@shared/infrastructure/queue/bull.module';
import { RedisModule } from '@shared/infrastructure/redis/redis.module';
import { MailModule } from '@shared/infrastructure/email/mail.module';

@Module({
  imports: [ConfigModule, MongoModule, BullModule, RedisModule, MailModule],
  providers: [{ provide: ID_GENERATOR_PORT, useClass: UUIDGenerator }],
  exports: [ID_GENERATOR_PORT, ConfigModule, MailModule],
})
export class SharedModule {}
