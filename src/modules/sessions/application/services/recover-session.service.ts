import { Inject, Injectable } from '@nestjs/common';
import {
  SESSION_TIMER_PORT,
  type ISessionTimerPort,
} from '@sessions/domain/ports/session-timer.port';

export interface RecoverSessionResult {
  sessionId: string;
  elapsedMs: number;
  taskId: string;
  taskEstimatedDurationMinutes: number;
  plantGrowthPercent: number;
}

@Injectable()
export class RecoverSessionService {
  constructor(
    @Inject(SESSION_TIMER_PORT)
    private readonly sessionTimer: ISessionTimerPort,
  ) {}

  /**
   * Called on WebSocket reconnect.
   * Checks Redis for an in-flight session — if found, returns resume state.
   * Returns null if no active session.
   */
  async execute(userId: string): Promise<RecoverSessionResult | null> {
    const sessionId = await this.sessionTimer.getActiveSessionId(userId);
    if (!sessionId) return null;

    const timer = await this.sessionTimer.getTimer(sessionId);
    if (!timer) return null;

    const elapsedMs = Date.now() - timer.startedAt;
    const elapsedMinutes = elapsedMs / 60_000;
    const plantGrowthPercent =
      timer.taskEstimatedDurationMinutes > 0
        ? Math.min(
            100,
            Math.round(
              (elapsedMinutes / timer.taskEstimatedDurationMinutes) * 100,
            ),
          )
        : 0;

    return {
      sessionId,
      elapsedMs,
      taskId: timer.taskId,
      taskEstimatedDurationMinutes: timer.taskEstimatedDurationMinutes,
      plantGrowthPercent,
    };
  }
}
