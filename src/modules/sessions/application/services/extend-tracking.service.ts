import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SESSION_TIMER_PORT,
  type ISessionTimerPort,
} from '@sessions/domain/ports/session-timer.port';

export interface ExtendTrackingResult {
  sessionId: string;
  taskEstimatedDurationMs: number;
  elapsedMs: number;
  plantGrowthPercent: number;
}

@Injectable()
export class ExtendTrackingService {
  constructor(
    @Inject(SESSION_TIMER_PORT)
    private readonly sessionTimer: ISessionTimerPort,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
    additionalMs: number,
  ): Promise<ExtendTrackingResult> {
    const timer = await this.sessionTimer.getTimer(sessionId);
    if (!timer || timer.userId !== userId) {
      throw new NotFoundException('No active timer found for this session.');
    }

    const updated = await this.sessionTimer.extendTimer(
      sessionId,
      additionalMs,
    );

    const elapsedMs = Date.now() - updated.startedAt;
    const plantGrowthPercent =
      updated.taskEstimatedDurationMs > 0
        ? Math.min(
            100,
            Math.round(
              ((elapsedMs + updated.previousNetFocusMsForTask) /
                updated.taskEstimatedDurationMs) *
                100,
            ),
          )
        : 0;

    return {
      sessionId,
      taskEstimatedDurationMs: updated.taskEstimatedDurationMs,
      elapsedMs,
      plantGrowthPercent,
    };
  }
}
