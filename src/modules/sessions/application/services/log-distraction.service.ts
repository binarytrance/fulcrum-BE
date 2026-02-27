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
import type { Session } from '@sessions/domain/entities/session.entity';

export interface LogDistractionInput {
  sessionId: string;
  userId: string;
  reason: string;
  estimatedMinutes: number;
}

@Injectable()
export class LogDistractionService {
  constructor(
    @Inject(SESSION_REPO_PORT)
    private readonly sessionRepo: ISessionRepository,
  ) {}

  async execute(input: LogDistractionInput): Promise<Session> {
    const session = await this.sessionRepo.findById(input.sessionId);
    if (!session) throw new NotFoundException('Session not found.');
    if (session.userId !== input.userId)
      throw new ForbiddenException('Access denied.');

    const updated = session.addDistraction({
      reason: input.reason,
      estimatedMinutes: input.estimatedMinutes,
    });

    await this.sessionRepo.update(updated);
    return updated;
  }
}
