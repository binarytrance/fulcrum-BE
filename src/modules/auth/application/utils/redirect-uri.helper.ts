import { BadRequestException } from '@nestjs/common';

export function parseAllowedOrigins(rawOrigins: string): Set<string> {
  return new Set(
    rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function validateRedirectUriAgainstAllowlist(
  redirectUri: string,
  allowedOrigins: Set<string>,
): string {
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new BadRequestException('Invalid redirect_uri');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new BadRequestException('Invalid redirect_uri protocol');
  }

  if (!allowedOrigins.has(parsed.origin)) {
    throw new BadRequestException('redirect_uri origin is not allowed');
  }

  return parsed.toString();
}

export function appendQueryParams(
  redirectUri: string,
  query: Record<string, string>,
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
