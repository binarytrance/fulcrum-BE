import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@shared/config/config.service';
import { type ITokenService, TOKEN_PORT } from '@auth/domain/ports/token.port';
import { TokenPayload } from '@auth/domain/types/token.types';

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

function getBearerToken(req: Request): string | null {
  const raw = req.headers.authorization;
  if (!raw) return null;
  const [scheme, token] = raw.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  return token || null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => getCookieValue(req, 'refreshToken'),
      ]),
      secretOrKey: configService.tokenSecrets.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: TokenPayload): Promise<TokenPayload> {
    const token = getBearerToken(req) ?? getCookieValue(req, 'refreshToken');
    if (!token) throw new UnauthorizedException('No refresh token provided');

    const isValid = await this.tokenService.isRefreshTokenValid(
      payload.sub,
      token,
    );
    if (!isValid)
      throw new UnauthorizedException('Refresh token invalid or expired');

    return payload;
  }
}
