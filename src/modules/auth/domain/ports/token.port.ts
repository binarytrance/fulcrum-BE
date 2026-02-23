import { AuthTokens, TokenPayload } from '@auth/domain/types/token.types';

export const TOKEN_PORT = Symbol('TOKEN_PORT');

export interface ITokenService {
  generateTokens(userId: string, email: string): Promise<AuthTokens>;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
  storeRefreshToken(userId: string, token: string): Promise<void>;
  revokeRefreshToken(userId: string): Promise<void>;
  isRefreshTokenValid(userId: string, token: string): Promise<boolean>;
}
