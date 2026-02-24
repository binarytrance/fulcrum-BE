import { Inject, Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class SignupService {
  private readonly logger = new Logger('SignupService');

  constructor(
    @Inject(PASSWORD_HASH_PORT)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(PENDING_CREDENTIAL_REPO_PORT)
    private readonly pendingCredentialRepo: IPendingCredentialRepository,
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
}
