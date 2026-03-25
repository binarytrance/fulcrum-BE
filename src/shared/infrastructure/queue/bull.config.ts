import { ConfigService } from '@shared/config/config.service';
import { createRedisConfig } from '@shared/infrastructure/redis/redis.config';
import { QueueOptions } from 'bullmq';

/**
 * Returns BullMQ root options using plain Redis connection options.
 * Avoids passing a top-level ioredis instance (which would conflict with
 * BullMQ's bundled internal ioredis copy and cause TypeScript type errors).
 * BullMQ manages its own connection lifecycle from the provided options.
 */
export const createBullConfig = (config: ConfigService): QueueOptions => {
  return {
    connection: {
      ...createRedisConfig(config),
      // BullMQ overrides — these must take precedence over createRedisConfig defaults
      maxRetriesPerRequest: null, // required by BullMQ
      commandTimeout: 30000, // Upstash has higher latency than local Redis
      enableOfflineQueue: true, // BullMQ needs this to buffer commands during reconnect
    },
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  };
};
