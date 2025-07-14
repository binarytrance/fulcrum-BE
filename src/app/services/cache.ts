import { env } from '~/data/env';
import { logger } from './logger';
import { RedisProvider } from './redis';

export class Cache {
  private static instance: Cache;
  private redisProvider: RedisProvider;
  private prefix: string = env.APP.NAME;
  private ttl: number = 600;

  constructor() {
    this.redisProvider = RedisProvider.getInstance();
  }

  private constructKey(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new Cache();
    }

    return this.instance;
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const constructedKey = this.constructKey(key);
      const value = await this.redisProvider.client.get(constructedKey);

      if (value) {
        logger.info('[Cache HIT]', { key: constructedKey });
        return JSON.parse(value) as T;
      } else {
        logger.warn('[Cache MISS]', { key: constructedKey });
        return null;
      }
    } catch (err) {
      logger.error('Redis Error', { error: err, key });
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttl?: number) {
    try {
      await this.redisProvider.client.set(
        this.constructKey(key),
        JSON.stringify(value),
        'EX',
        ttl ?? this.ttl,
      );
    } catch (err) {
      logger.error('Redis Error', { error: err, key });
    }
  }

  public async delete(key: string) {
    try {
      await this.redisProvider.client.del(this.constructKey(key));
    } catch (err) {
      logger.error('Redis Error', { error: err, key });
    }
  }

  public async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number,
  ) {
    logger.info('executing inside getorset');
    let data = await this.get<T>(key);
    if (data) {
      return data;
    }

    try {
      data = await fetchFn();
      if (data) {
        await this.set<T>(key, data, ttl);
      }
    } catch (err) {
      logger.error('error fethcing', { error: err });
    }

    return data;
  }

  public async getOrSetWithLock<T>(
    key: string,
    fetchFn: () => Promise<T>,
    lockTtl: number = 5,
    cacheTtl: number = 600,
    pollMs: number = 100,
    maxWaitMs: number = 5000,
  ) {
    const constructedKey = this.constructKey(key);
    let data = await this.get<T>(constructedKey);
    if (data) {
      return data;
    }

    const lockKey = `${constructedKey}:lock`;
    const locked = await this.redisProvider.client.set(
      lockKey,
      '1',
      'EX',
      lockTtl,
      'NX',
    );

    if (locked) {
      data = await fetchFn();
      if (data) {
        await this.set<T>(key, data, cacheTtl);
      }
      await this.delete(lockKey);
    } else {
      const start = Date.now();
      while (Date.now() - start < maxWaitMs) {
        await new Promise((r) => setTimeout(r, pollMs));
        data = await this.get<T>(key);
        if (data) {
          return data;
        }
      }
    }

    return await fetchFn();
  }
}
