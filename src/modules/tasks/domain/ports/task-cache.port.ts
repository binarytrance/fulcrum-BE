export const TASK_CACHE_PORT = Symbol('TASK_CACHE_PORT');

export interface ITaskCachePort {
  getDaily<T>(userId: string, date: Date): Promise<T | null>;
  setDaily<T>(userId: string, date: Date, data: T): Promise<void>;
  invalidate(userId: string, date: Date | null): Promise<void>;
}
