import { Module } from '@nestjs/common';

import { UsersModule } from '@users/users.module';
import { AuthModule } from '@auth/auth.module';
import { SharedModule } from '@shared/shared.module';
import { GoalsModule } from '@goals/goals.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { SessionsModule } from '@/modules/sessions/sessions.module';

@Module({
  imports: [SharedModule, UsersModule, AuthModule, GoalsModule, TasksModule, SessionsModule],
})
export class AppModule {}
