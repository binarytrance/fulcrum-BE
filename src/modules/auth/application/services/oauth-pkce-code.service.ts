import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import type { OAuthProfile } from '@auth/domain/types/token.types';
import { REDIS_CLIENT } from '@shared/infrastructure/redis/redis.provider';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';

const AUTH_CODE_TTL_SECONDS = 60;

interface StoredOAuthAuthCode {
  profile: OAuthProfile;
  codeChallenge: string;
  provider: 'google' | 'github';
  createdAt: string;
}

@Injectable()
export class OAuthPkceCodeService {
  private readonly logger = new Logger(OAuthPkceCodeService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
  ) {}

  async issueAuthorizationCode(payload: {
    profile: OAuthProfile;
    codeChallenge: string;
    provider: 'google' | 'github';
  }): Promise<string> {
    for (let attempts = 0; attempts < 3; attempts++) {
      const code = this.idGenerator.generate();
      const value: StoredOAuthAuthCode = {
        profile: payload.profile,
        codeChallenge: payload.codeChallenge,
        provider: payload.provider,
        createdAt: new Date().toISOString(),
      };

      const result = await this.redis.set(
        this.getAuthCodeKey(code),
        JSON.stringify(value),
        'EX',
        AUTH_CODE_TTL_SECONDS,
        'NX',
      );

      if (result === 'OK') return code;
    }

    throw new Error('Unable to create OAuth authorization code');
  }

  async consumeAuthorizationCode(
    code: string,
  ): Promise<StoredOAuthAuthCode | null> {
    const transaction = await this.redis
      .multi()
      .get(this.getAuthCodeKey(code))
      .del(this.getAuthCodeKey(code))
      .exec();

    const raw = transaction?.[0]?.[1];
    if (typeof raw !== 'string') return null;

    try {
      return JSON.parse(raw) as StoredOAuthAuthCode;
    } catch {
      this.logger.warn('Invalid OAuth authorization code payload in Redis');
      return null;
    }
  }

  private getAuthCodeKey(code: string): string {
    return `oauth:auth-code:${code}`;
  }
}
