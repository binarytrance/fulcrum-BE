import { Module } from '@nestjs/common';

import { UsersModule } from '@users/users.module';
import { AuthModule } from '@auth/auth.module';
import { SharedModule } from '@shared/shared.module';
import { GoalsModule } from '@goals/goals.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { FocusSessionsModule } from '@/modules/focus-sessions/focus-sessions.module';
import { HabitsModule } from '@/modules/habits/habits.module';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';

@Module({
  imports: [
    SharedModule,
    UsersModule,
    AuthModule,
    GoalsModule,
    TasksModule,
    FocusSessionsModule,
    HabitsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
