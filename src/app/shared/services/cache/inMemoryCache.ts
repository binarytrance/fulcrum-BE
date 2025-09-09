import { inject, singleton } from 'tsyringe';
import { LRUCache } from 'lru-cache';
import { Env, Logger } from '@shared/config';
import { CacheOptions, ICache } from '@interfaces';
import { Tokens } from '@core/di';

@singleton()
export class InMemoryCache implements ICache {
  constructor(
    private readonly logger: Logger,
    @inject(Tokens.LRU_MAIN) private readonly store: LRUCache<string, any>,
    @inject(Tokens.LRU_TAG_INDEX)
    private readonly tagIndex: LRUCache<string, Set<string>>
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = this.store.get(key);
      return value ? (value as T) : null;
    } catch (err: unknown) {
      this.logger.warn('[L1 GET] treating failure as miss', { key, err });
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttlMs ?? 0;
      this.store.set(key, value, { ttl });

      for (const tag of options?.tags ?? []) {
        const set = this.tagIndex.get(tag) ?? new Set<string>();
        set.add(key);
        this.tagIndex.set(tag, set, {
          ttl: options?.ttlMs ? Math.max(options.ttlMs, 60_000) : 60_000,
        });
      }
    } catch (err: unknown) {
      this.logger.error('[L1 SET] failed', { key, err });
    }
  }

  async del(key: string): Promise<void> {
    try {
      this.store.delete(key);
    } catch (err: unknown) {
      this.logger.error('[L1 DEL] failed', { key, err });
    }
  }

  async invalidateTags(tags: Array<string>): Promise<number> {
    let total: number = 0;

    try {
      for (const tag of tags) {
        const keys = this.tagIndex.get(tag);
        if (!keys) {
          continue;
        }

        for (const key of keys) {
          if (this.store.delete(key)) {
            total++;
          }
        }

        this.tagIndex.delete(tag);
      }
    } catch (err: unknown) {
      this.logger.error('[L1 TAG-INV] failed', { tags, err });
    }

    return total;
  }

  async getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const value = await this.get<T>(key);

    if (value) {
      return value;
    }

    const fresh = await loader();
    await this.set<T>(key, fresh, options);
    return fresh;
  }
}
