import { Request, Response, CookieOptions } from 'express';
import { ConfigService } from '@shared/config/config.service';
import { AuthTokens } from '@auth/domain/types/token.types';

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';

export function setAuthCookies(
  res: Response,
  tokens: AuthTokens,
  configService: ConfigService,
): void {
  res.cookie(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    buildCookieOptions(configService, configService.auth.accessCookieMaxAgeSeconds),
  );
  res.cookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    buildCookieOptions(configService, configService.auth.refreshCookieMaxAgeSeconds),
  );
}

export function clearAuthCookies(
  res: Response,
  configService: ConfigService,
): void {
  const options = buildCookieOptions(configService, 0);
  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
}

export function getAccessTokenFromCookies(req: Request): string | null {
  return getCookieValue(req, ACCESS_TOKEN_COOKIE);
}

export function getRefreshTokenFromCookies(req: Request): string | null {
  return getCookieValue(req, REFRESH_TOKEN_COOKIE);
}

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

function buildCookieOptions(
  configService: ConfigService,
  maxAgeSeconds: number,
): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,
    secure: configService.auth.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  };

  if (configService.auth.cookieDomain) {
    options.domain = configService.auth.cookieDomain;
  }

  return options;
}
