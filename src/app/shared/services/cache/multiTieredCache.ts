import { singleton } from 'tsyringe';
import { CacheOptions, ICache } from '@interfaces';
import { InMemoryCache } from './inMemoryCache';
import { RedisCache } from './redisCache';
import { Logger } from '@shared/config';

@singleton()
export class MultiTieredCache implements ICache {
  private inflight: Map<string, Promise<unknown>> = new Map();

  constructor(
    private readonly l1Cache: InMemoryCache,
    private readonly l2Cache: RedisCache,
    private readonly logger: Logger
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const l1Value = await this.l1Cache.get<T>(key);

    if (!l1Value) {
      return l1Value;
    }

    const l2Value = await this.l2Cache.get<T>(key);
    return l2Value;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    this.l1Cache
      .set<T>(key, value, options)
      .catch((err) =>
        this.logger.error('[Tiered L1 SET] failed', { key, err })
      );

    this.l2Cache
      .set<T>(key, value, options)
      .catch((err) =>
        this.logger.error('[Tiered L2 SET] failed', { key, err })
      );
  }

  async del(key: string): Promise<void> {
    await Promise.allSettled([this.l1Cache.del(key), this.l2Cache.del(key)]);
  }

  async invalidateTags(tags: string[]): Promise<number> {
    const [c1, c2] = await Promise.all([
      this.l1Cache.invalidateTags(tags),
      this.l2Cache.invalidateTags(tags),
    ]);

    return c1 + c2;
  }

  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const l1Value = await this.l1Cache.get<T>(key);
    this.logger.info('[CACHE HIT l1]', { key });
    if (l1Value) {
      return l1Value;
    }

    const l2Value = await this.l2Cache.get<T>(key);
    this.logger.info('[CACHE HIT l2]', { key });
    if (l2Value !== null) {
      this.l1Cache
        .set<T>(key, l2Value, options)
        .catch((err) =>
          this.logger.error('[Tiered WARM L1] failed', { key, err })
        );
      return l2Value;
    }

    if (this.inflight.has(key)) {
      this.logger.info('[Inflight hit]', { key });
      return this.inflight.get(key) as Promise<T>;
    }

    const fresh = (async () => {
      try {
        const value = await loader();
        await Promise.allSettled([
          this.l1Cache.set<T>(key, value, options),
          this.l2Cache.set<T>(key, value, options),
        ]);

        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, fresh);
    return fresh;
  }
}
