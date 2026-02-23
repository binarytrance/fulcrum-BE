import { Module } from '@nestjs/common';
import { AuthController } from '@auth/presentation/controllers/auth.controller';
import { AUTH_REPO_PORT } from '@auth/domain/ports/auth-repo.port';
import { CREATE_USER_PORT } from '@auth/domain/ports/create-user.port';
import { EVENT_PUBLISHER_PORT } from '@auth/domain/ports/event-publisher.port';
import { PASSWORD_HASH_PORT } from '@auth/domain/ports/password-hasher.port';
import { AuthRepository } from '@auth/infrastructure/persistence/auth.repository';
import { BcryptHasher } from '@auth/infrastructure/security/bcrypt-hasher';
import { SharedModule } from '@shared/shared.module';
import { UsersModule } from '@users/users.module';
import { CreateUserService } from '@users/application/services/create-user.service';
import { SignupService } from '@auth/application/services/signup.service';
import { AuthWorkersModule } from '@auth/infrastructure/workers/auth-workers.module';
import { AuthMongoModule } from '@auth/infrastructure/persistence/auth-mongo.module';
import { SignupEmailEventPublisher } from '@auth/infrastructure/event-publisher/signup-email.event-publisher';

@Module({
  imports: [SharedModule, UsersModule, AuthWorkersModule, AuthMongoModule],
  controllers: [AuthController],
  providers: [
    { provide: AUTH_REPO_PORT, useClass: AuthRepository },
    { provide: PASSWORD_HASH_PORT, useClass: BcryptHasher },
    { provide: CREATE_USER_PORT, useClass: CreateUserService },
    { provide: EVENT_PUBLISHER_PORT, useClass: SignupEmailEventPublisher },
    SignupService,
  ],
})
export class AuthModule {}
