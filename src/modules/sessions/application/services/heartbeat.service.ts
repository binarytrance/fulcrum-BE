import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SESSION_TIMER_PORT,
  type ISessionTimerPort,
} from '@sessions/domain/ports/session-timer.port';

export interface HeartbeatResult {
  /** Current elapsed time in milliseconds (server-computed). */
  elapsedMs: number;
  /**
   * Approximate plant growth percent based on elapsed vs estimated duration.
   * NetFocusTime won't be exact until stop (distractions reduce it), but this
   * gives the client something to animate.
   */
  plantGrowthPercent: number;
}

@Injectable()
export class HeartbeatService {
  constructor(
    @Inject(SESSION_TIMER_PORT)
    private readonly sessionTimer: ISessionTimerPort,
  ) {}

  async execute(sessionId: string, userId: string): Promise<HeartbeatResult> {
    const timer = await this.sessionTimer.getTimer(sessionId);

    if (!timer || timer.userId !== userId) {
      throw new NotFoundException('No active timer found for this session.');
    }

    const elapsedMs = await this.sessionTimer.heartbeat(sessionId);

    if (elapsedMs === null) {
      throw new NotFoundException('Timer expired or missing.');
    }

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

    return { elapsedMs, plantGrowthPercent };
  }
}
