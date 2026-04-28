import { PasswordResetToken } from '@auth/domain/entities/password-reset-token.entity';

export const PASSWORD_RESET_TOKEN_REPO_PORT = Symbol(
  'PASSWORD_RESET_TOKEN_REPO_PORT',
);

export interface IPasswordResetTokenRepository {
  save(token: PasswordResetToken): Promise<void>;
  findByEmail(email: string): Promise<PasswordResetToken | null>;
  deleteByEmail(email: string): Promise<void>;
}
