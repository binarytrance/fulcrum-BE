import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Session } from '@focus-sessions/domain/entities/session.entity';
import {
  SESSION_REPO_PORT,
  type ISessionRepository,
} from '@focus-sessions/domain/ports/session-repo.port';
import {
  SESSION_TIMER_PORT,
  type ISessionTimerPort,
} from '@focus-sessions/domain/ports/session-timer.port';
import {
  TASK_ACCESS_PORT,
  type ITaskAccessPort,
} from '@focus-sessions/domain/ports/task-access.port';
import {
  PlantStatus,
  SessionSource,
  SessionStatus,
} from '@focus-sessions/domain/types/session.types';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';

export interface StartSessionResult {
  sessionId: string;
  serverStartedAt: number; // ms epoch — client must use this, not its own clock
  taskEstimatedDuration: number;
  previousNetFocusForTask: number;
}

@Injectable()
export class StartSessionService {
  constructor(
    @Inject(SESSION_REPO_PORT)
    private readonly sessionRepo: ISessionRepository,
    @Inject(SESSION_TIMER_PORT)
    private readonly sessionTimer: ISessionTimerPort,
    @Inject(TASK_ACCESS_PORT)
    private readonly taskAccess: ITaskAccessPort,
    @Inject(ID_GENERATOR_PORT)
    private readonly idGenerator: IIDGenerator,
  ) {}

  async execute(userId: string, taskId: string): Promise<StartSessionResult> {
    // Verify user owns the task
    await this.taskAccess.verifyOwnership(taskId, userId);

    // Enforce one active session at a time
    const existing = await this.sessionRepo.findActiveByUserId(userId);
    if (existing) {
      throw new ConflictException(
        `Session ${existing.id} is already active. Stop it before starting a new one.`,
      );
    }

    const estimatedDuration = await this.taskAccess.getEstimatedDuration(
      taskId,
      userId,
    );
    const now = new Date();
    const sessionId = this.idGenerator.generate();

    const session = new Session({
      id: sessionId,
      userId,
      taskId,
      status: SessionStatus.ACTIVE,
      source: SessionSource.AUTO,
      startedAt: now,
      endedAt: null,
      duration: null,
      netFocus: null,
      distractions: [],
      plantStatus: PlantStatus.HEALTHY,
      plantGrowthPercent: 0,
      createdAt: now,
    });

    await this.sessionRepo.create(session);

    const previousNetFocusForTask =
      await this.sessionRepo.sumNetFocusByTaskId(taskId);

    await this.sessionTimer.startTimer({
      sessionId,
      taskId,
      userId,
      startedAt: now.getTime(),
      lastHeartbeatAt: now.getTime(),
      taskEstimatedDuration: estimatedDuration,
      previousNetFocusForTask,
    });

    return {
      sessionId,
      serverStartedAt: now.getTime(),
      taskEstimatedDuration: estimatedDuration,
      previousNetFocusForTask,
    };
  }
}
