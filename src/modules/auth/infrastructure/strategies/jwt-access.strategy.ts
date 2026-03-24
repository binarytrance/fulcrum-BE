import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@shared/config/config.service';
import { TokenPayload } from '@auth/domain/types/token.types';
import type { Request } from 'express';

function getCookieValue(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const target = `${name}=`;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(target)) continue;
    return decodeURIComponent(trimmed.slice(target.length));
  }
  return null;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => getCookieValue(req, 'accessToken'),
      ]),
      secretOrKey: configService.tokenSecrets.jwtAccessSecret,
    });
  }

  validate(payload: TokenPayload): TokenPayload {
    return payload;
  }
}
