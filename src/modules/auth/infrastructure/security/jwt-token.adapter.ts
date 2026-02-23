import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { ConfigService } from '@shared/config/config.service';
import { REDIS_CLIENT } from '@shared/infrastructure/redis/redis.provider';
import { ITokenService } from '@auth/domain/ports/token.port';
import { AuthTokens, TokenPayload } from '@auth/domain/types/token.types';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

@Injectable()
export class JwtTokenAdapter implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const payload: TokenPayload = { sub: userId, email };
    const { jwtAccessSecret, jwtRefreshSecret } =
      this.configService.tokenSecrets;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtAccessSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtRefreshSecret,
        expiresIn: '7d',
      }),
    ]);

    await this.storeRefreshToken(userId, refreshToken);

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

  async storeRefreshToken(userId: string, token: string): Promise<void> {
    const hashed = await bcrypt.hash(token, 10);
    await this.redis.set(
      `refresh:${userId}`,
      hashed,
      'EX',
      REFRESH_TOKEN_TTL_SECONDS,
    );
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}`);
  }

  async isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
    const hashed = await this.redis.get(`refresh:${userId}`);
    if (!hashed) return false;
    return bcrypt.compare(token, hashed);
  }
}
