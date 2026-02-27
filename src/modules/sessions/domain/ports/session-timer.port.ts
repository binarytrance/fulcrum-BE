/**
 * Represents the in-flight timer state stored in Redis.
 * Contains enough data to reconstruct elapsed time and plant growth
 * without hitting MongoDB on every heartbeat.
 */
export interface ActiveTimerState {
  sessionId: string;
  taskId: string;
  userId: string;
  /** Unix timestamp (ms) when the timer was started on the server. */
  startedAt: number;
  /** Unix timestamp (ms) of the last heartbeat. Used for abandonment detection. */
  lastHeartbeatAt: number;
  /** Stored here so heartbeat can compute plantGrowthPercent without a DB lookup. */
  taskEstimatedDurationMinutes: number;
}

export const SESSION_TIMER_PORT = Symbol('SESSION_TIMER_PORT');

export interface ISessionTimerPort {
  /** Store timer state and link userId → sessionId. */
  startTimer(state: ActiveTimerState): Promise<void>;

  /** Read timer state for a session. Returns null if expired/missing. */
  getTimer(sessionId: string): Promise<ActiveTimerState | null>;

  /**
   * Refresh lastHeartbeatAt and return current elapsed milliseconds.
   * Returns null if the timer key no longer exists.
   */
  heartbeat(sessionId: string): Promise<number | null>;

  /** Returns the active sessionId for a user, or null if none. */
  getActiveSessionId(userId: string): Promise<string | null>;

  /** Remove both timer and active-session keys when a session ends. */
  clearTimer(userId: string, sessionId: string): Promise<void>;

  /** Returns elapsed ms from startedAt. Returns null if timer missing. */
  getElapsedMs(sessionId: string): Promise<number | null>;
}
