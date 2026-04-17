import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';

import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';

const TOKEN_EXPIRY_MINUTES = 15;
import { PendingCredential } from '@auth/domain/entities/pending-credential.entity';
import { SignupEmailEvent } from '@auth/domain/events/signup-email.event';
import {
  type IPasswordHasher,
  PASSWORD_HASH_PORT,
} from '@auth/domain/ports/password-hasher.port';
import {
  EVENT_PUBLISHER_PORT,
  type IEventPublisher,
} from '@auth/domain/ports/event-publisher.port';
import {
  PENDING_CREDENTIAL_REPO_PORT,
  type IPendingCredentialRepository,
} from '@auth/domain/ports/pending-credential-repo.port';
import {
  FIND_USER_PORT,
  type IFindUserPort,
} from '@auth/domain/ports/find-user.port';
import {
  AUTH_REPO_PORT,
  type IAuthRepository,
} from '@auth/domain/ports/auth-repo.port';
import { AuthProviders } from '@auth/domain/types/auth.types';

@Injectable()
export class SignupService {
  private readonly logger = new Logger('SignupService');

  constructor(
    @Inject(PASSWORD_HASH_PORT)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(PENDING_CREDENTIAL_REPO_PORT)
    private readonly pendingCredentialRepo: IPendingCredentialRepository,
    @Inject(FIND_USER_PORT) private readonly findUser: IFindUserPort,
    @Inject(AUTH_REPO_PORT) private readonly authRepo: IAuthRepository,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
    @Inject(EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  public async create(
    email: string,
    password: string,
    firstname: string,
    lastname: string,
  ) {
    const existingUser = await this.findUser.findByEmail(email);
    if (existingUser) {
      const localAuth = await this.authRepo.findByUserIdAndProvider(
        existingUser.id,
        AuthProviders.LOCAL,
      );

      if (localAuth) {
        throw new ConflictException('Email already registered');
      }

      throw new ConflictException(
        'Email is already registered with another sign-in method',
      );
    }

    const hashedPassword = await this.passwordHasher.hashPassword(password);
    const emailVerificationToken = randomBytes(3).toString('hex'); // e.g. "a3f9c2"
    const tokenExpiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    const pending = new PendingCredential({
      id: this.idGenerator.generate(),
      email,
      firstname,
      lastname,
      hashedPassword,
      emailVerificationToken,
      tokenExpiresAt,
      createdAt: new Date(),
    });

    await this.pendingCredentialRepo.save(pending);

    this.logger.log(`Stored pending signup for: ${email}`);

    await this.eventPublisher.publish(
      new SignupEmailEvent(email, emailVerificationToken),
    );
  }

  public async resendVerification(email: string): Promise<void> {
    const existing = await this.pendingCredentialRepo.findByEmail(email);
    if (!existing) {
      // Return silently to avoid leaking which emails are pending
      return;
    }

    const emailVerificationToken = randomBytes(3).toString('hex');
    const tokenExpiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000,
    );

    const refreshed = new PendingCredential({
      id: existing.id,
      email: existing.email,
      firstname: existing.firstname,
      lastname: existing.lastname,
      hashedPassword: existing.hashedPassword,
      emailVerificationToken,
      tokenExpiresAt,
      createdAt: existing.createdAt,
    });

    await this.pendingCredentialRepo.save(refreshed);
    this.logger.log(`Resent verification email to: ${email}`);

    await this.eventPublisher.publish(
      new SignupEmailEvent(email, emailVerificationToken),
    );
  }
}
