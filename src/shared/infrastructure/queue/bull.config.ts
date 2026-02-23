import { ConfigService } from '@shared/config/config.service';
import { QueueOptions } from 'bullmq';

export const createBullConfig = (config: ConfigService): QueueOptions => {
  return {
    connection: {
      port: config.redis.port,
      host: config.redis.host,
      username: config.redis.username,
      password: config.redis.password,
    },
    defaultJobOptions: {
      removeOnComplete: { count: 100 },
      removeOnFail: false,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  };
};
