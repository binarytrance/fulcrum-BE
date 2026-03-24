import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { ConfigService } from '@shared/config/config.service';

interface OAuthStatePayload {
  redirectUri: string;
  exp: number;
  nonce: string;
}

const STATE_TTL_SECONDS = 10 * 60;

@Injectable()
export class OauthStateService {
  constructor(private readonly configService: ConfigService) {}

  create(redirectUri: string): string {
    const payload: OAuthStatePayload = {
      redirectUri,
      exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
      nonce: randomBytes(16).toString('hex'),
    };

    const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.sign(payloadEncoded);
    return `${payloadEncoded}.${signature}`;
  }

  verifyAndGetRedirectUri(state: string): string {
    const [payloadEncoded, signature] = state.split('.');
    if (!payloadEncoded || !signature) {
      throw new BadRequestException('Invalid OAuth state');
    }

    const expectedSignature = this.sign(payloadEncoded);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Invalid OAuth state');
    }

    let payload: OAuthStatePayload;
    try {
      payload = JSON.parse(
        Buffer.from(payloadEncoded, 'base64url').toString(),
      ) as OAuthStatePayload;
    } catch {
      throw new BadRequestException('Invalid OAuth state payload');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new BadRequestException('OAuth state has expired');
    }

    if (!payload.redirectUri) {
      throw new BadRequestException('OAuth state missing redirect URI');
    }

    return payload.redirectUri;
  }

  private sign(payload: string): string {
    return createHmac('sha256', this.configService.auth.oauthStateSecret)
      .update(payload)
      .digest('base64url');
  }
}
