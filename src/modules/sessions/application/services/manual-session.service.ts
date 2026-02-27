import { Inject, Injectable } from '@nestjs/common';
import { Session } from '@sessions/domain/entities/session.entity';
import {
  SESSION_REPO_PORT,
  type ISessionRepository,
} from '@sessions/domain/ports/session-repo.port';
import {
  SESSION_EVENT_PUBLISHER_PORT,
  type ISessionEventPublisher,
} from '@sessions/domain/ports/session-event-publisher.port';
import {
  TASK_ACCESS_PORT,
  type ITaskAccessPort,
} from '@sessions/domain/ports/task-access.port';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import { SessionCompletedEvent } from '@sessions/domain/events/session-completed.event';
import {
  PlantStatus,
  SessionSource,
  SessionStatus,
} from '@sessions/domain/types/session.types';
import type { Distraction } from '@sessions/domain/entities/session.entity';

export interface ManualSessionInput {
  userId: string;
  taskId: string;
  durationMinutes: number;
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
  ) {}

  async execute(input: ManualSessionInput): Promise<Session> {
    await this.taskAccess.verifyOwnership(input.taskId, input.userId);
    const estimatedDurationMinutes = await this.taskAccess.getEstimatedDuration(
      input.taskId,
      input.userId,
    );

    const now = new Date();
    const startedAt = input.startedAt ? new Date(input.startedAt) : now;
    const sessionId = this.idGenerator.generate();

    const netFocusMinutes = input.durationMinutes;
    const plantGrowthPercent =
      estimatedDurationMinutes > 0
        ? Math.min(
            100,
            Math.round((netFocusMinutes / estimatedDurationMinutes) * 100),
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
      durationMinutes: input.durationMinutes,
      netFocusMinutes,
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
        input.durationMinutes,
      ),
    );

    return session;
  }
}
