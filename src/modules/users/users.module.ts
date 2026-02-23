import { Module } from '@nestjs/common';
import { UsersController } from '@users/presenation/controllers/users.controller';
import { CreateUserService } from '@users/application/services/create-user.service';
import { USER_REPO_PORT } from '@users/domain/ports/user-rep.port';
import { UserRepository } from '@users/infrastructure/persistence/user.repository';
import { SharedModule } from '@shared/shared.module';
import { UserMongoModule } from '@users/infrastructure/persistence/user-mongo.module';

@Module({
  imports: [SharedModule, UserMongoModule],
  controllers: [UsersController],
  providers: [
    CreateUserService,
    { provide: USER_REPO_PORT, useClass: UserRepository },
  ],
  exports: [CreateUserService, USER_REPO_PORT],
})
export class UsersModule {}
