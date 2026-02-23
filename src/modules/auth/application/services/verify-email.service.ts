import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type ITokenService, TOKEN_PORT } from '@auth/domain/ports/token.port';
import type { AuthTokens } from '@auth/domain/types/token.types';
import {
  AUTH_REPO_PORT,
  type IAuthRepository,
} from '@auth/domain/ports/auth-repo.port';
import {
  PENDING_CREDENTIAL_REPO_PORT,
  type IPendingCredentialRepository,
} from '@auth/domain/ports/pending-credential-repo.port';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import {
  CREATE_USER_PORT,
  type ICreateUserPort,
} from '@auth/domain/ports/create-user.port';
import { Auth } from '@auth/domain/entities/auth.entity';
import { AuthProviders } from '@auth/domain/types/auth.types';

@Injectable()
export class VerifyEmailService {
  constructor(
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
    @Inject(AUTH_REPO_PORT) private readonly authRepo: IAuthRepository,
    @Inject(PENDING_CREDENTIAL_REPO_PORT)
    private readonly pendingCredentialRepo: IPendingCredentialRepository,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
    @Inject(CREATE_USER_PORT) private readonly createUserPort: ICreateUserPort,
  ) {}

  async execute(email: string, token: string): Promise<AuthTokens> {
    const pending = await this.pendingCredentialRepo.findByEmail(email);
    if (!pending) throw new UnauthorizedException('Invalid credentials');

    if (pending.emailVerificationToken !== token)
      throw new UnauthorizedException('Invalid or expired verification token');

    const existingAuth = await this.authRepo.findByProvider(
      AuthProviders.LOCAL,
      email,
    );
    if (existingAuth)
      throw new BadRequestException('Email is already verified');

    const newUser = await this.createUserPort.execute(
      pending.email,
      pending.firstname,
      pending.lastname,
    );

    const now = new Date();
    const auth = new Auth({
      id: this.idGenerator.generate(),
      userId: newUser.id,
      hashedPassword: pending.hashedPassword,
      provider: AuthProviders.LOCAL,
      providerId: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.authRepo.create(auth);
    await this.pendingCredentialRepo.deleteById(pending.id);

    return this.tokenService.generateTokens(newUser.id, pending.email);
  }
}
