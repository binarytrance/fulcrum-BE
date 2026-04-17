import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type ITokenService, TOKEN_PORT } from '@auth/domain/ports/token.port';
import type {
  AuthTokens,
  RefreshSessionContext,
} from '@auth/domain/types/token.types';
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
import {
  TRANSACTION_MANAGER_PORT,
  type ITransactionManager,
} from '@shared/domain/ports/transaction-manager.port';
import { Auth } from '@auth/domain/entities/auth.entity';
import { AuthProviders } from '@auth/domain/types/auth.types';
import {
  FIND_USER_PORT,
  type IFindUserPort,
} from '@auth/domain/ports/find-user.port';

@Injectable()
export class VerifyEmailService {
  constructor(
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
    @Inject(AUTH_REPO_PORT) private readonly authRepo: IAuthRepository,
    @Inject(PENDING_CREDENTIAL_REPO_PORT)
    private readonly pendingCredentialRepo: IPendingCredentialRepository,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
    @Inject(CREATE_USER_PORT) private readonly createUserPort: ICreateUserPort,
    @Inject(FIND_USER_PORT) private readonly findUser: IFindUserPort,
    @Inject(TRANSACTION_MANAGER_PORT)
    private readonly txManager: ITransactionManager,
  ) {}

  async execute(
    email: string,
    token: string,
    context?: RefreshSessionContext,
  ): Promise<AuthTokens> {
    const pending = await this.pendingCredentialRepo.findByEmail(email);
    if (!pending) throw new UnauthorizedException('Invalid credentials');

    if (pending.isTokenExpired())
      throw new UnauthorizedException('Verification token has expired');

    if (pending.emailVerificationToken !== token)
      throw new UnauthorizedException('Invalid verification token');

    const existingUser = await this.findUser.findByEmail(email);
    if (existingUser) {
      const existingLocalAuth = await this.authRepo.findByUserIdAndProvider(
        existingUser.id,
        AuthProviders.LOCAL,
      );

      if (existingLocalAuth) {
        throw new BadRequestException('Email is already verified');
      }

      throw new ConflictException(
        'Email is already registered with another sign-in method',
      );
    }

    return this.txManager.withTransaction(async () => {
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

      return this.tokenService.generateTokens(newUser.id, pending.email, {
        context,
      });
    });
  }
}
