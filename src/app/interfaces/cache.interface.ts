export interface CacheOptions {
  ttlMs?: number;
  tags?: Array<string>;
}

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  del(key: string): Promise<void>;
  invalidateTags(tags: Array<string>): Promise<number>;
  getOrSet<T>(
    key: string,
    loader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T>;
}
