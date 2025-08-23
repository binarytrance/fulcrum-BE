import { inject, singleton } from 'tsyringe';
import IoRedis, { Redis as RedisClient } from 'ioredis';
import { Logger, Env } from '@shared/config';
import { Tokens } from '@core/di';

@singleton()
export class Redis {
  constructor(
    private readonly env: Env,
    private readonly logger: Logger,
    @inject(Tokens.REDIS) private readonly redisClient: IoRedis
  ) {}

  public get connection(): RedisClient {
    return this.redisClient;
  }

  public async checkConnection(): Promise<boolean> {
    try {
      const result = await this.redisClient.ping();
      this.logger.info('Redis PING successful', { result });
      return result === 'PONG';
    } catch (err) {
      this.logger.error('Redis PING failed', {
        err: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  public async end(): Promise<void> {
    await this.redisClient.quit();
    this.logger.info('Redis connection closed gracefully.');
  }

  private initClient(): RedisClient {
    return new IoRedis({
      host: this.env.storage.REDIS_HOST,
      port: this.env.storage.REDIS_PORT,
      password: this.env.storage.REDIS_PASSWORD,
      // Retry with backoff, cap attempts
      retryStrategy: (times) => {
        if (times > 5) {
          this.logger.error('Too many reconnect attempts to Redis');
          return null; // stop retrying
        }
        const delay = Math.min(times * 200, 2000);
        this.logger.warn(
          `Reconnecting to Redis in ${delay}ms (attempt ${times})`
        );
        return delay;
      },
    });
  }

  public wireEvents() {
    this.redisClient.on('connect', () => this.logger.info('Redis connecting…'));
    this.redisClient.on('ready', () => this.logger.info('Redis ready'));
    this.redisClient.on('reconnecting', () =>
      this.logger.warn('Redis reconnecting…')
    );
    this.redisClient.on('end', () =>
      this.logger.warn('Redis connection ended')
    );
    this.redisClient.on('error', (err) =>
      this.logger.error('Redis error', { err: err?.message })
    );
  }
}
