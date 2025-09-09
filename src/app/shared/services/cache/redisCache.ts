import { singleton } from 'tsyringe';
import { CacheOptions, ICache } from '@interfaces';
import { Redis } from '@core/infra';
import { Env, Logger } from '@shared/config';

@singleton()
export class RedisCache implements ICache {
  private inflight: Map<string, Promise<unknown>> = new Map();

  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
    private readonly env: Env
  ) {}

  public async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.connection.get(key);
      if (!raw) {
        return null;
      }

      return this.safeParse<T>(raw);
    } catch (err: unknown) {
      this.logger.warn('[CACHE MISS] failed to get', { key, err });
      return null;
    }
  }

  public async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    try {
      const payload = this.safeStringify(value);
      if (!payload) {
        this.logger.error('[CACHE SKIP] failed to stringify', { key });
        return;
      }

      const pipeline = this.redis.connection.pipeline();
      if (options?.ttlMs && options.ttlMs > 0) {
        pipeline.set(key, payload, 'PX', options.ttlMs);
      } else {
        pipeline.set(key, payload);
      }

      for (const tag of options?.tags ?? []) {
        const tagKey = this.getTagKey(tag);
        pipeline.sadd(tagKey, key);

        if (options?.ttlMs && options.ttlMs > 0) {
          pipeline.pexpire(tagKey, Math.max(options.ttlMs, 60_000));
        } else {
          pipeline.expire(tagKey, 60);
        }
      }

      await pipeline.exec();
    } catch (err: unknown) {
      this.logger.error('[CACHE SET] failed to set cache', { key, err });
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.redis.connection.del(key);
    } catch (err) {
      this.logger.error('[CACHE DEL] failed to delete cache', { key, err });
    }
  }

  public async invalidateTags(tags: Array<string>): Promise<number> {
    let total: number = 0;

    try {
      for (const tag of tags) {
        const tagKey = this.getTagKey(tag);
        const keys = await this.redis.connection.smembers(tagKey);

        if (!keys.length) {
          continue;
        }

        const pipeline = this.redis.connection.pipeline();
        keys.forEach((key) => pipeline.del(key));
        pipeline.del(tagKey);
        await pipeline.exec();
        total += keys.length;
      }
    } catch (err: unknown) {
      this.logger?.error('[cache] invalidateTags failed', { tags, err });
    }

    return total;
  }

  public async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const hit = await this.get<T>(key);
    if (hit) {
      return hit;
    }

    if (this.inflight.has(key)) {
      return this.inflight.get(key) as Promise<T>;
    }

    const fresh = (async () => {
      try {
        const value = await loader();
        this.set<T>(key, value, options);
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, fresh);
    return fresh;
  }

  private getTagKey(tag: string) {
    return `${this.env.app.NAME}:${this.env.app.NODE_ENV}:tag:${tag}`;
  }

  private safeStringify(value: unknown): string | null {
    try {
      return JSON.stringify(value);
    } catch (err: unknown) {
      this.logger.error('failed to strinify', { err });
      return null;
    }
  }

  private safeParse<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      this.logger.error('failed to parse stringify data', { err });
      return null;
    }
  }
}
