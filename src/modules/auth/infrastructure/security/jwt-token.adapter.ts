import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { ConfigService } from '@shared/config/config.service';
import { REDIS_CLIENT } from '@shared/infrastructure/redis/redis.provider';
import { ITokenService } from '@auth/domain/ports/token.port';
import {
  AuthTokens,
  GenerateTokenOptions,
  RefreshSession,
  RefreshSessionContext,
  TokenPayload,
} from '@auth/domain/types/token.types';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

interface StoredRefreshSession extends RefreshSession {
  userId: string;
}

@Injectable()
export class JwtTokenAdapter implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
  ) {}

  async generateTokens(
    userId: string,
    email: string,
    options?: GenerateTokenOptions,
  ): Promise<AuthTokens> {
    const sessionId = options?.sessionId ?? this.idGenerator.generate();
    const payload: TokenPayload = { sub: userId, email, sessionId };
    const { jwtAccessSecret, jwtRefreshSecret } =
      this.configService.tokenSecrets;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtAccessSecret,
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret,
        expiresIn: '7d',
      }),
    ]);

    await this.storeRefreshToken(
      userId,
      sessionId,
      refreshToken,
      options?.context,
    );

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.tokenSecrets.jwtAccessSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.tokenSecrets.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async storeRefreshToken(
    userId: string,
    sessionId: string,
    token: string,
    context?: RefreshSessionContext,
  ): Promise<void> {
    const hashed = await bcrypt.hash(token, 10);
    const now = new Date();
    const existingSession = await this.getStoredSession(userId, sessionId);
    const session: StoredRefreshSession = {
      sessionId,
      userId,
      userAgent: context?.userAgent ?? existingSession?.userAgent ?? null,
      ipAddress: context?.ipAddress ?? existingSession?.ipAddress ?? null,
      createdAt: existingSession?.createdAt ?? now.toISOString(),
      lastRotatedAt: now.toISOString(),
      expiresAt: new Date(
        now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000,
      ).toISOString(),
    };

    await this.redis
      .multi()
      .set(
        this.getRefreshKey(userId, sessionId),
        hashed,
        'EX',
        REFRESH_TOKEN_TTL_SECONDS,
      )
      .set(
        this.getRefreshSessionKey(userId, sessionId),
        JSON.stringify(session),
        'EX',
        REFRESH_TOKEN_TTL_SECONDS,
      )
      .sadd(this.getRefreshSessionIndexKey(userId), sessionId)
      .expire(this.getRefreshSessionIndexKey(userId), REFRESH_TOKEN_TTL_SECONDS)
      .exec();
  }

  async revokeRefreshToken(userId: string, sessionId: string): Promise<void> {
    await this.redis
      .multi()
      .del(this.getRefreshKey(userId, sessionId))
      .del(this.getRefreshSessionKey(userId, sessionId))
      .srem(this.getRefreshSessionIndexKey(userId), sessionId)
      .exec();
  }

  async isRefreshTokenValid(
    userId: string,
    sessionId: string,
    token: string,
  ): Promise<boolean> {
    const hashed = await this.redis.get(this.getRefreshKey(userId, sessionId));
    if (!hashed) return false;
    return bcrypt.compare(token, hashed);
  }

  async listRefreshSessions(userId: string): Promise<RefreshSession[]> {
    const sessionIds = await this.redis.smembers(
      this.getRefreshSessionIndexKey(userId),
    );
    if (sessionIds.length === 0) return [];

    const sessions = await Promise.all(
      sessionIds.map(async (sessionId) => {
        const [tokenExists, storedSession] = await Promise.all([
          this.redis.exists(this.getRefreshKey(userId, sessionId)),
          this.getStoredSession(userId, sessionId),
        ]);

        if (!tokenExists || !storedSession) {
          await this.revokeRefreshToken(userId, sessionId);
          return null;
        }

        const { userId: _userId, ...session } = storedSession;
        return session;
      }),
    );

    return sessions
      .filter((session): session is RefreshSession => session !== null)
      .sort((left, right) =>
        right.lastRotatedAt.localeCompare(left.lastRotatedAt),
      );
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(
      this.getRefreshSessionIndexKey(userId),
    );
    if (sessionIds.length === 0) return;

    const pipeline = this.redis.multi();
    for (const sessionId of sessionIds) {
      pipeline.del(this.getRefreshKey(userId, sessionId));
      pipeline.del(this.getRefreshSessionKey(userId, sessionId));
    }

    pipeline.del(this.getRefreshSessionIndexKey(userId));
    await pipeline.exec();
  }

  private getRefreshKey(userId: string, sessionId: string): string {
    return `refresh:${userId}:${sessionId}`;
  }

  private getRefreshSessionKey(userId: string, sessionId: string): string {
    return `refresh:session:${userId}:${sessionId}`;
  }

  private getRefreshSessionIndexKey(userId: string): string {
    return `refresh:sessions:${userId}`;
  }

  private async getStoredSession(
    userId: string,
    sessionId: string,
  ): Promise<StoredRefreshSession | null> {
    const raw = await this.redis.get(
      this.getRefreshSessionKey(userId, sessionId),
    );
    if (!raw) return null;
    return JSON.parse(raw) as StoredRefreshSession;
  }
}
