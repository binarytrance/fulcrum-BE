import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import { Auth } from '@auth/domain/entities/auth.entity';
import { AuthProviders } from '@auth/domain/types/auth.types';
import { SignupEmailEvent } from '@auth/domain/events/signup-email.event';
import {
  type IPasswordHasher,
  PASSWORD_HASH_PORT,
} from '@auth/domain/ports/password-hasher.port';
import {
  type IAuthRepository,
  AUTH_REPO_PORT,
} from '@auth/domain/ports/auth-repo.port';
import {
  CREATE_USER_PORT,
  type ICreateUserPort,
} from '@auth/domain/ports/create-user.port';
import {
  EVENT_PUBLISHER_PORT,
  type IEventPublisher,
} from '@auth/domain/ports/event-publisher.port';

@Injectable()
export class SignupService {
  private readonly logger = new Logger('SignupService');

  constructor(
    @Inject(PASSWORD_HASH_PORT)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(AUTH_REPO_PORT) private readonly authRepo: IAuthRepository,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
    @Inject(CREATE_USER_PORT) private readonly createUserPort: ICreateUserPort,
    @Inject(EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: IEventPublisher,
  ) {}

  public async create(
    email: string,
    password: string,
    firstname: string,
    lastname: string,
  ) {
    const id = this.idGenerator.generate();
    const now = new Date();
    const hashedPassword = await this.passwordHasher.hashPassword(password);

    const user = await this.createUserPort.execute(email, firstname, lastname);

    const auth = new Auth({
      id,
      hashedPassword,
      createdAt: now,
      updatedAt: now,
      provider: AuthProviders.LOCAL,
      providerId: null,
      userId: user.id,
    });

    this.logger.log(`created user is: ${user.emailVerificationToken}`);

    await this.authRepo.create(auth);

    await this.eventPublisher.publish(
      new SignupEmailEvent(email, user.emailVerificationToken),
    );
  }
}
