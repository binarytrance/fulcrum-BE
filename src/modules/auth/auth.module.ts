import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '@auth/presentation/controllers/auth.controller';
import { AUTH_REPO_PORT } from '@auth/domain/ports/auth-repo.port';
import { CREATE_USER_PORT } from '@auth/domain/ports/create-user.port';
import { EVENT_PUBLISHER_PORT } from '@auth/domain/ports/event-publisher.port';
import { PASSWORD_HASH_PORT } from '@auth/domain/ports/password-hasher.port';
import { TOKEN_PORT } from '@auth/domain/ports/token.port';
import { FIND_USER_PORT } from '@auth/domain/ports/find-user.port';
import { CREATE_OAUTH_USER_PORT } from '@auth/domain/ports/create-oauth-user.port';
import { AuthRepository } from '@auth/infrastructure/persistence/auth.repository';
import { BcryptHasher } from '@auth/infrastructure/security/bcrypt-hasher';
import { JwtTokenAdapter } from '@auth/infrastructure/security/jwt-token.adapter';
import { GoogleStrategy } from '@auth/infrastructure/strategies/google.strategy';
import { GithubStrategy } from '@auth/infrastructure/strategies/github.strategy';
import { JwtAccessStrategy } from '@auth/infrastructure/strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from '@auth/infrastructure/strategies/jwt-refresh.strategy';
import { SharedModule } from '@shared/shared.module';
import { UsersModule } from '@users/users.module';
import { CreateUserService } from '@users/application/services/create-user.service';
import { CreateOAuthUserService } from '@users/application/services/create-oauth-user.service';
import { SignupService } from '@auth/application/services/signup.service';
import { LocalSigninService } from '@auth/application/services/local-signin.service';
import { OAuthSigninService } from '@auth/application/services/oauth-signin.service';
import { AuthWorkersModule } from '@auth/infrastructure/workers/auth-workers.module';
import { AuthMongoModule } from '@auth/infrastructure/persistence/auth-mongo.module';
import { PENDING_CREDENTIAL_REPO_PORT } from '@auth/domain/ports/pending-credential-repo.port';
import { PendingCredentialRepository } from '@auth/infrastructure/persistence/pending-credential.repository';
import { VerifyEmailService } from '@auth/application/services/verify-email.service';
import { SignupEmailEventPublisher } from '@auth/infrastructure/event-publisher/signup-email.event-publisher';
import { USER_REPO_PORT } from '@users/domain/ports/user-rep.port';
import { OauthStateService } from '@auth/application/services/oauth-state.service';
import { GoogleOAuthRedirectService } from '@auth/application/services/google-oauth-redirect.service';

@Module({
  imports: [
    SharedModule,
    UsersModule,
    AuthWorkersModule,
    AuthMongoModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    // Repositories & infrastructure
    { provide: AUTH_REPO_PORT, useClass: AuthRepository },
    { provide: PASSWORD_HASH_PORT, useClass: BcryptHasher },
    { provide: TOKEN_PORT, useClass: JwtTokenAdapter },
    { provide: CREATE_USER_PORT, useClass: CreateUserService },
    { provide: CREATE_OAUTH_USER_PORT, useClass: CreateOAuthUserService },
    { provide: EVENT_PUBLISHER_PORT, useClass: SignupEmailEventPublisher },
    {
      provide: PENDING_CREDENTIAL_REPO_PORT,
      useClass: PendingCredentialRepository,
    },
    // FIND_USER_PORT reuses the already-registered USER_REPO_PORT from UsersModule
    { provide: FIND_USER_PORT, useExisting: USER_REPO_PORT },

    // Application services
    SignupService,
    LocalSigninService,
    OAuthSigninService,
    VerifyEmailService,
    OauthStateService,
    GoogleOAuthRedirectService,

    // Passport strategies
    GoogleStrategy,
    GithubStrategy,
    JwtAccessStrategy,
    JwtRefreshStrategy,
  ],
})
export class AuthModule {}
