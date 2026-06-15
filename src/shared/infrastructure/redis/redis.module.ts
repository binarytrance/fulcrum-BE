import { Module } from '@nestjs/common';
import { RedisClientProvider, RedisLifecycle } from '@shared/infrastructure/redis/redis.provider';
import { RedisHealthMonitor } from '@shared/infrastructure/redis/redis.heath-monitor';
import { ConfigModule } from '@shared/config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [RedisClientProvider, RedisLifecycle, RedisHealthMonitor],
  exports: [RedisClientProvider, RedisHealthMonitor],
})
export class RedisModule {}
