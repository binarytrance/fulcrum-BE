export const GOAL_CACHE_PORT = Symbol('GOAL_CACHE_PORT');

export interface IGoalCachePort {
  getTree<T>(userId: string): Promise<T | null>;
  setTree<T>(userId: string, tree: T): Promise<void>;
  invalidate(userId: string): Promise<void>;
}