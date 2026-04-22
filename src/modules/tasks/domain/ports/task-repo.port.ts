import type { Task } from '@tasks/domain/entities/task.entity';
import type { TaskStatus, TaskType } from '@tasks/domain/types/task.types';

export interface TaskFilter {
  status?: TaskStatus;
  type?: TaskType;
  goalId?: string;
  /** When provided, only tasks whose scheduledFor falls within this calendar day (UTC) are returned. */
  scheduledFor?: Date;
}

export interface Pagination {
  /** 1-based page number */
  page: number;
  /** Items per page */
  limit: number;
}

export interface TaskStats {
  /** Total non-deleted tasks for the user */
  total: number;
  /** Per-status breakdown; every TaskStatus key is always present (0 if none) */
  byStatus: Record<TaskStatus, number>;
  /** Per-type breakdown; every TaskType key is always present (0 if none) */
  byType: Record<TaskType, number>;
}

export const TASK_REPO_PORT = Symbol('TASK_REPO_PORT');

export interface ITaskRepository {
  create(task: Task): Promise<void>;
  findById(id: string): Promise<Task | null>;
  /**
   * All non-deleted tasks for a user on a given calendar date.
   * Uses scheduledFor range: [start-of-day, end-of-day] UTC.
   */
  findByDate(userId: string, date: Date): Promise<Task[]>;
  findByUserId(
    userId: string,
    filter?: TaskFilter,
    pagination?: Pagination,
  ): Promise<Task[]>;
  countByUserId(userId: string, filter?: TaskFilter): Promise<number>;
  searchByUserId(
    userId: string,
    q: string,
    pagination: Pagination,
  ): Promise<Task[]>;
  countSearchByUserId(userId: string, q: string): Promise<number>;
  /** Returns total task count + per-status and per-type breakdowns in a single aggregation. */
  getStats(userId: string): Promise<TaskStats>;
  /**
   * Sums estimatedDuration (ms) for all tasks of a user whose scheduledFor
   * falls within the given calendar day (UTC).
   */
  sumDailyDuration(userId: string, date: Date): Promise<number>;
  update(task: Task): Promise<void>;
  /** Permanently removes the task document from MongoDB. */
  delete(id: string): Promise<void>;
}
