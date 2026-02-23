import { AuthProviders } from './auth.types';

export interface TokenPayload {
  sub: string;
  email: string;
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
