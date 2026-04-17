import { Inject, Injectable } from '@nestjs/common';
import { TOKEN_PORT, type ITokenService } from '@auth/domain/ports/token.port';
import type {
  AuthSessionView,
  AuthTokens,
  RefreshSessionContext,
} from '@auth/domain/types/token.types';

@Injectable()
export class AuthSessionService {
  constructor(
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
  ) {}

  async rotateTokens(
    userId: string,
    email: string,
    sessionId: string,
    context: RefreshSessionContext,
  ): Promise<AuthTokens> {
    return this.tokenService.generateTokens(userId, email, {
      sessionId,
      context,
    });
  }

  async listUserSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<AuthSessionView[]> {
    const sessions = await this.tokenService.listRefreshSessions(userId);
    return sessions.map((session) => ({
      ...session,
      current: session.sessionId === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(userId, sessionId);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.tokenService.revokeAllRefreshTokens(userId);
  }
}
