import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import {
  AUTH_REPO_PORT,
  type IAuthRepository,
} from '@auth/domain/ports/auth-repo.port';
import {
  PASSWORD_HASH_PORT,
  type IPasswordHasher,
} from '@auth/domain/ports/password-hasher.port';
import {
  PASSWORD_RESET_TOKEN_REPO_PORT,
  type IPasswordResetTokenRepository,
} from '@auth/domain/ports/password-reset-token-repo.port';
import { AuthProviders } from '@auth/domain/types/auth.types';
import {
  FIND_USER_PORT,
  type IFindUserPort,
} from '@auth/domain/ports/find-user.port';
import { Auth } from '@auth/domain/entities/auth.entity';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import {
  TRANSACTION_MANAGER_PORT,
  type ITransactionManager,
} from '@shared/domain/ports/transaction-manager.port';

@Injectable()
export class ResetPasswordService {
  private readonly logger = new Logger('ResetPasswordService');

  constructor(
    @Inject(PASSWORD_RESET_TOKEN_REPO_PORT)
    private readonly resetTokenRepo: IPasswordResetTokenRepository,
    @Inject(FIND_USER_PORT) private readonly findUser: IFindUserPort,
    @Inject(AUTH_REPO_PORT) private readonly authRepo: IAuthRepository,
    @Inject(PASSWORD_HASH_PORT)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
    @Inject(TRANSACTION_MANAGER_PORT)
    private readonly txManager: ITransactionManager,
  ) {}

  async execute(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<void> {
    // Validate the reset token
    const storedToken = await this.resetTokenRepo.findByEmail(email);

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (storedToken.isExpired()) {
      await this.resetTokenRepo.deleteByEmail(email);
      throw new UnauthorizedException('Reset token has expired');
    }

    if (storedToken.resetToken !== token) {
      throw new UnauthorizedException('Invalid reset token');
    }

    // Find user and local auth credentials
    const user = await this.findUser.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const localAuth = await this.authRepo.findByUserIdAndProvider(
      user.id,
      AuthProviders.LOCAL,
    );

    if (!localAuth) {
      throw new UnauthorizedException(
        'No local password account found for this email',
      );
    }

    // Hash the new password and update within a transaction
    await this.txManager.withTransaction(async () => {
      const hashedPassword =
        await this.passwordHasher.hashPassword(newPassword);

      const updatedAuth = new Auth({
        id: localAuth.id,
        userId: localAuth.userId,
        hashedPassword,
        provider: AuthProviders.LOCAL,
        providerId: localAuth.providerId,
        createdAt: localAuth.createdAt,
        updatedAt: new Date(),
      });

      await this.authRepo.update(updatedAuth);
      await this.resetTokenRepo.deleteByEmail(email);
    });

    this.logger.log(`Password reset successfully for: ${email}`);
  }
}
