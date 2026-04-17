import { AuthProviders } from './auth.types';

export interface TokenPayload {
  sub: string;
  email: string;
  sessionId: string;
}

export interface RefreshSessionContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface RefreshSession {
  sessionId: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastRotatedAt: string;
  expiresAt: string;
}

export interface AuthSessionView extends RefreshSession {
  current: boolean;
}

export interface GenerateTokenOptions {
  sessionId?: string;
  context?: RefreshSessionContext;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OAuthProfile {
  provider: AuthProviders;
  providerId: string;
  email: string;
  firstname: string;
  lastname: string | null;
}
