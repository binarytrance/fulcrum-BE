import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  type IAuthRepository,
  AUTH_REPO_PORT,
} from '@auth/domain/ports/auth-repo.port';
import { type ITokenService, TOKEN_PORT } from '@auth/domain/ports/token.port';
import { Auth } from '@auth/domain/entities/auth.entity';
import type { AuthTokens, OAuthProfile } from '@auth/domain/types/token.types';
import {
  type IFindUserPort,
  type AuthUserView,
  FIND_USER_PORT,
} from '@auth/domain/ports/find-user.port';
import {
  type ICreateOAuthUserPort,
  CREATE_OAUTH_USER_PORT,
} from '@auth/domain/ports/create-oauth-user.port';
import {
  type IIDGenerator,
  ID_GENERATOR_PORT,
} from '@shared/domain/ports/id-generator.port';

@Injectable()
export class OAuthSigninService {
  private readonly logger = new Logger(OAuthSigninService.name);

  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: IFindUserPort,
    @Inject(CREATE_OAUTH_USER_PORT)
    private readonly createOAuthUser: ICreateOAuthUserPort,
    @Inject(AUTH_REPO_PORT) private readonly authRepo: IAuthRepository,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
  ) {}

  async execute(profile: OAuthProfile): Promise<AuthTokens> {
    // Try to find existing auth record for this provider
    let auth = await this.authRepo.findByProvider(
      profile.provider,
      profile.providerId,
    );

    if (!auth) {
      // Check if user already exists (account merging by email)
      let user: AuthUserView | null = await this.findUser.findByEmail(
        profile.email,
      );

      if (!user) {
        user = await this.createOAuthUser.execute(
          profile.email,
          profile.firstname,
          profile.lastname,
        );
        this.logger.log(`Created new OAuth user: ${profile.email}`);
      }

      // Create new auth record for this provider
      const authId = this.idGenerator.generate();
      const now = new Date();
      auth = new Auth({
        id: authId,
        userId: user.id,
        provider: profile.provider,
        providerId: profile.providerId,
        hashedPassword: null,
        createdAt: now,
        updatedAt: now,
      });
      await this.authRepo.create(auth);
      this.logger.log(`Created auth record for provider: ${profile.provider}`);
    }

    const user = await this.findUser.findById(auth.userId);
    if (!user) throw new InternalServerErrorException('User not found');

    return this.tokenService.generateTokens(auth.userId, user.email);
  }
}
