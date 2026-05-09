import type { Session } from '@focus-sessions/domain/entities/session.entity';

export const SESSION_REPO_PORT = Symbol('SESSION_REPO_PORT');

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
}
