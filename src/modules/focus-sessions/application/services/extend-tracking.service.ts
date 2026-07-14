import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SESSION_TIMER_PORT,
  type ISessionTimerPort,
} from '@focus-sessions/domain/ports/session-timer.port';

export interface ExtendTrackingResult {
  sessionId: string;
  taskEstimatedDuration: number;
  elapsed: number;
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
    additional: number,
  ): Promise<ExtendTrackingResult> {
    const timer = await this.sessionTimer.getTimer(sessionId);
    if (!timer || timer.userId !== userId) {
      throw new NotFoundException('No active timer found for this session.');
    }

    const updated = await this.sessionTimer.extendTimer(
      sessionId,
      additional,
    );

    const elapsed = Date.now() - updated.startedAt;
    const plantGrowthPercent =
      updated.taskEstimatedDuration > 0
        ? Math.min(
            100,
            Math.round(
              ((elapsed + updated.previousNetFocusForTask) /
                updated.taskEstimatedDuration) *
                100,
            ),
          )
        : 0;

    return {
      sessionId,
      taskEstimatedDuration: updated.taskEstimatedDuration,
      elapsed,
      plantGrowthPercent,
    };
  }
}
