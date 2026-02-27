import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SESSION_REPO_PORT,
  type ISessionRepository,
} from '@sessions/domain/ports/session-repo.port';
import {
  SESSION_TIMER_PORT,
  type ISessionTimerPort,
} from '@sessions/domain/ports/session-timer.port';
import {
  SESSION_EVENT_PUBLISHER_PORT,
  type ISessionEventPublisher,
} from '@sessions/domain/ports/session-event-publisher.port';
import {
  TASK_ACCESS_PORT,
  type ITaskAccessPort,
} from '@sessions/domain/ports/task-access.port';
import { SessionCompletedEvent } from '@sessions/domain/events/session-completed.event';
import type { Session } from '@sessions/domain/entities/session.entity';

@Injectable()
export class StopSessionService {
  constructor(
    @Inject(SESSION_REPO_PORT)
    private readonly sessionRepo: ISessionRepository,
    @Inject(SESSION_TIMER_PORT)
    private readonly sessionTimer: ISessionTimerPort,
    @Inject(SESSION_EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: ISessionEventPublisher,
    @Inject(TASK_ACCESS_PORT)
    private readonly taskAccess: ITaskAccessPort,
  ) {}

  async execute(sessionId: string, userId: string): Promise<Session> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found.');
    if (session.userId !== userId)
      throw new ForbiddenException('Access denied.');

    // Get final elapsed from Redis — server time is the source of truth
    const elapsedMs = await this.sessionTimer.getElapsedMs(sessionId);

    // If Redis key expired (e.g. crash + recovery), fall back to wall-clock diff
    const finalElapsedMs =
      elapsedMs ?? Date.now() - session.startedAt.getTime();
    const durationMinutes = Math.max(1, Math.round(finalElapsedMs / 60_000));

    // Fetch task's estimated duration for plant growth calculation
    const estimatedDurationMinutes = await this.taskAccess.getEstimatedDuration(
      session.taskId,
      userId,
    );

    const completed = session.complete(
      durationMinutes,
      estimatedDurationMinutes,
    );

    // Persist the final session document (immutable — never edited again)
    await this.sessionRepo.update(completed);

    // Clear Redis state
    await this.sessionTimer.clearTimer(userId, sessionId);

    // Queue background jobs (update task actualDuration, etc.)
    await this.eventPublisher.publishSessionCompleted(
      new SessionCompletedEvent(
        sessionId,
        userId,
        session.taskId,
        durationMinutes,
      ),
    );

    return completed;
  }
}
