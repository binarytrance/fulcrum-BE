import { Inject, Injectable } from '@nestjs/common';
import { Session } from '@focus-sessions/domain/entities/session.entity';
import {
  SESSION_REPO_PORT,
  type ISessionRepository,
} from '@focus-sessions/domain/ports/session-repo.port';
import {
  SESSION_EVENT_PUBLISHER_PORT,
  type ISessionEventPublisher,
} from '@focus-sessions/domain/ports/session-event-publisher.port';
import {
  TASK_ACCESS_PORT,
  type ITaskAccessPort,
} from '@focus-sessions/domain/ports/task-access.port';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import { SessionCompletedEvent } from '@focus-sessions/domain/events/session-completed.event';
import {
  APP_STREAK_EVENT_PUBLISHER_PORT,
  type IAppStreakEventPublisher,
} from '@users/domain/ports/app-streak-event-publisher.port';
import {
  PlantStatus,
  SessionSource,
  SessionStatus,
} from '@focus-sessions/domain/types/session.types';
import type { Distraction } from '@focus-sessions/domain/entities/session.entity';

export interface ManualSessionInput {
  userId: string;
  taskId: string;
  duration: number;
  /** ISO string of when the work was done. Defaults to now. */
  startedAt?: string;
  note?: string;
}

@Injectable()
export class ManualSessionService {
  constructor(
    @Inject(SESSION_REPO_PORT)
    private readonly sessionRepo: ISessionRepository,
    @Inject(SESSION_EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: ISessionEventPublisher,
    @Inject(TASK_ACCESS_PORT)
    private readonly taskAccess: ITaskAccessPort,
    @Inject(ID_GENERATOR_PORT)
    private readonly idGenerator: IIDGenerator,
    @Inject(APP_STREAK_EVENT_PUBLISHER_PORT)
    private readonly appStreakPublisher: IAppStreakEventPublisher,
  ) {}

  async execute(input: ManualSessionInput): Promise<Session> {
    await this.taskAccess.verifyOwnership(input.taskId, input.userId);
    const estimatedDuration = await this.taskAccess.getEstimatedDuration(
      input.taskId,
      input.userId,
    );

    const now = new Date();
    const startedAt = input.startedAt ? new Date(input.startedAt) : now;
    const sessionId = this.idGenerator.generate();

    const netFocus = input.duration;
    const previousNetFocusForTask =
      await this.sessionRepo.sumNetFocusByTaskId(input.taskId);
    const cumulativeNetFocus = previousNetFocusForTask + netFocus;
    const plantGrowthPercent =
      estimatedDuration > 0
        ? Math.min(
            100,
            Math.round((cumulativeNetFocus / estimatedDuration) * 100),
          )
        : 0;

    const distractions: Distraction[] = [];

    const session = new Session({
      id: sessionId,
      userId: input.userId,
      taskId: input.taskId,
      status: SessionStatus.COMPLETED,
      source: SessionSource.MANUAL,
      startedAt,
      endedAt: now,
      duration: input.duration,
      netFocus,
      distractions,
      plantStatus: PlantStatus.HEALTHY,
      plantGrowthPercent,
      createdAt: now,
    });

    await this.sessionRepo.create(session);

    await this.eventPublisher.publishSessionCompleted(
      new SessionCompletedEvent(
        sessionId,
        input.userId,
        input.taskId,
        input.duration,
      ),
    );
    await this.appStreakPublisher.publishActivityRecorded(
      input.userId,
      new Date().toISOString().slice(0, 10),
    );

    return session;
  }
}
