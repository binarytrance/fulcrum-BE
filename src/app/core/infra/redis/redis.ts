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
