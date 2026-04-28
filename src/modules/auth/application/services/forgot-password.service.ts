import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';

import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import {
  FIND_USER_PORT,
  type IFindUserPort,
} from '@auth/domain/ports/find-user.port';
import {
  AUTH_REPO_PORT,
  type IAuthRepository,
} from '@auth/domain/ports/auth-repo.port';
import { AuthProviders } from '@auth/domain/types/auth.types';
import { PasswordResetToken } from '@auth/domain/entities/password-reset-token.entity';
import {
  PASSWORD_RESET_TOKEN_REPO_PORT,
  type IPasswordResetTokenRepository,
} from '@auth/domain/ports/password-reset-token-repo.port';
import {
  FORGOT_PASSWORD_EVENT_PUBLISHER_PORT,
  type IForgotPasswordEventPublisher,
} from '@auth/domain/ports/forgot-password-event-publisher.port';
import { ForgotPasswordEmailEvent } from '@auth/domain/events/forgot-password-email.event';

const TOKEN_EXPIRY_MINUTES = 10;

@Injectable()
export class ForgotPasswordService {
  private readonly logger = new Logger('ForgotPasswordService');

  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: IFindUserPort,
    @Inject(AUTH_REPO_PORT) private readonly authRepo: IAuthRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPO_PORT)
    private readonly resetTokenRepo: IPasswordResetTokenRepository,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
    @Inject(FORGOT_PASSWORD_EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: IForgotPasswordEventPublisher,
  ) {}

  async requestReset(email: string): Promise<void> {
    // Check if user exists with local auth
    const user = await this.findUser.findByEmail(email);

    if (!user) {
      // Silent fail to avoid email enumeration
      this.logger.warn(`Password reset requested for unknown email: ${email}`);
      return;
    }

    const localAuth = await this.authRepo.findByUserIdAndProvider(
      user.id,
      AuthProviders.LOCAL,
    );

    if (!localAuth) {
      // User exists but signed up via OAuth — no local password to reset
      this.logger.warn(
        `Password reset requested for OAuth-only user: ${email}`,
      );
      return;
    }

    const resetToken = randomBytes(3).toString('hex'); // e.g. "a3f9c2"
    const tokenExpiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    const tokenEntity = new PasswordResetToken({
      id: this.idGenerator.generate(),
      email,
      resetToken,
      tokenExpiresAt,
      createdAt: new Date(),
    });

    await this.resetTokenRepo.save(tokenEntity);

    this.logger.log(`Password reset token saved for: ${email}`);

    await this.eventPublisher.publish(
      new ForgotPasswordEmailEvent(email, resetToken),
    );
  }
}
