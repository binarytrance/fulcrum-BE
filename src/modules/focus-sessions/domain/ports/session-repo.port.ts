import type { Session } from '@focus-sessions/domain/entities/session.entity';
import {
  PlantStatus,
  SessionSource,
  SessionStatus,
  SessionSortBy,
} from '@focus-sessions/domain/types/session.types';

export const SESSION_REPO_PORT = Symbol('SESSION_REPO_PORT');

export interface SessionListFilter {
  startDate: string;
  endDate?: string;
  status?: SessionStatus;
  source?: SessionSource;
  plantStatus?: PlantStatus;
  taskId?: string;
}

export interface SessionListSort {
  by: SessionSortBy;
  order: 'asc' | 'desc';
}

export interface SessionListPagination {
  page: number;
  limit: number;
}

export interface ISessionRepository {
  create(session: Session): Promise<void>;
  findById(id: string): Promise<Session | null>;
  findActiveByUserId(userId: string): Promise<Session | null>;
  update(session: Session): Promise<void>;
  /** Returns all ACTIVE sessions older than the given threshold date (for abandonment worker). */
  findStaleActive(olderThan: Date): Promise<Session[]>;
  findByTaskId(taskId: string): Promise<Session[]>;
  /**
   * Sums netFocusMs for all COMPLETED sessions belonging to a task.
   * Used to compute cumulative plant growth across sessions.
   */
  sumNetFocusMsByTaskId(taskId: string): Promise<number>;
  findByUser(
    userId: string,
    filter: SessionListFilter,
    sort: SessionListSort,
    pagination: SessionListPagination,
  ): Promise<{ items: Session[]; total: number }>;
}
