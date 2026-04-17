import {
  AuthTokens,
  GenerateTokenOptions,
  RefreshSession,
  RefreshSessionContext,
  TokenPayload,
} from '@auth/domain/types/token.types';

export const TOKEN_PORT = Symbol('TOKEN_PORT');

export interface ITokenService {
  generateTokens(
    userId: string,
    email: string,
    options?: GenerateTokenOptions,
  ): Promise<AuthTokens>;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
  storeRefreshToken(
    userId: string,
    sessionId: string,
    token: string,
    context?: RefreshSessionContext,
  ): Promise<void>;
  revokeRefreshToken(userId: string, sessionId: string): Promise<void>;
  isRefreshTokenValid(
    userId: string,
    sessionId: string,
    token: string,
  ): Promise<boolean>;
  listRefreshSessions(userId: string): Promise<RefreshSession[]>;
  revokeAllRefreshTokens(userId: string): Promise<void>;
}
