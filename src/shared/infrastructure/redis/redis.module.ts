import { Module } from '@nestjs/common';
import { RedisProvider } from '@shared/infrastructure/redis/redis.provider';
import { RedisHealthMonitor } from '@shared/infrastructure/redis/redis.heath-monitor';
import { ConfigModule } from '@shared/config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [RedisProvider, RedisHealthMonitor],
  exports: [RedisProvider, RedisHealthMonitor],
})
export class RedisModule {}
