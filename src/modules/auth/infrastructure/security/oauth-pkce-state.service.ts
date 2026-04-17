import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@shared/config/config.service';

const PKCE_CHALLENGE_REGEX = /^[A-Za-z0-9_-]{43,128}$/;
const STATE_TTL_MS = 10 * 60 * 1000;

type OAuthProvider = 'google' | 'github';

interface StatePayload {
  v: 1;
  p: OAuthProvider;
  cc: string;
  iat: number;
}

@Injectable()
export class OAuthPkceStateService {
  constructor(private readonly configService: ConfigService) {}

  createState(codeChallenge: string, provider: OAuthProvider): string {
    if (!PKCE_CHALLENGE_REGEX.test(codeChallenge)) {
      throw new BadRequestException('Invalid PKCE code_challenge format');
    }

    const payload: StatePayload = {
      v: 1,
      p: provider,
      cc: codeChallenge,
      iat: Date.now(),
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.sign(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  verifyState(
    state: string | undefined,
    expectedProvider: OAuthProvider,
  ): { codeChallenge: string } | null {
    if (!state) return null;

    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSignature = this.sign(encodedPayload);
    if (!this.safeEqual(signature, expectedSignature)) return null;

    let payload: StatePayload;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as StatePayload;
    } catch {
      return null;
    }

    if (payload.v !== 1) return null;
    if (payload.p !== expectedProvider) return null;
    if (!PKCE_CHALLENGE_REGEX.test(payload.cc)) return null;
    if (Date.now() - payload.iat > STATE_TTL_MS) return null;

    return { codeChallenge: payload.cc };
  }

  private sign(value: string): string {
    return createHmac('sha256', this.configService.tokenSecrets.jwtAccessSecret)
      .update(value)
      .digest('base64url');
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) return false;
    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
