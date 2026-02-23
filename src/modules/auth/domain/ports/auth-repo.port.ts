import { Auth } from '@/modules/auth/domain/entities/auth.entity';
import { AuthProviders } from '@/modules/auth/domain/types/auth.types';

export const AUTH_REPO_PORT = Symbol('AUTH_PORT');

export interface IAuthRepository {
  create(authAccount: Auth): Promise<void>;
  findByUserId(userId: string): Promise<Auth | null>;
  findByProvider(
    provider: AuthProviders,
    providerId: string,
  ): Promise<Auth | null>;
  update(authAccount: Auth): Promise<void>;
}
