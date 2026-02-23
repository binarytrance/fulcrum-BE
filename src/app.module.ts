import { Module } from '@nestjs/common';

import { UsersModule } from '@users/users.module';
import { AuthModule } from '@auth/auth.module';
import { SharedModule } from '@shared/shared.module';

@Module({
  imports: [SharedModule, UsersModule, AuthModule],
})
export class AppModule {}
