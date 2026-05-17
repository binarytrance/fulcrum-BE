import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';

import { TasksController } from '@tasks/presentation/controllers/tasks.controller';

import { CreateTaskService } from '@tasks/application/services/create-task.service';
import { UpdateTaskService } from '@tasks/application/services/update-task.service';
import { DeleteTaskService } from '@tasks/application/services/delete-task.service';
import { GetTasksService } from '@tasks/application/services/get-tasks.service';

import { TASK_REPO_PORT } from '@tasks/domain/ports/task-repo.port';
import { GOAL_OWNERSHIP_PORT } from '@tasks/domain/ports/goal-ownership.port';
import { TASK_CACHE_PORT } from '@tasks/domain/ports/task-cache.port';
import { GOAL_TITLE_PORT } from '@tasks/domain/ports/goal-title.port';
import { TaskRepository } from '@tasks/infrastructure/persistence/task.repository';
import { TaskMongoModule } from '@tasks/infrastructure/persistence/task-mongo.module';
import { TaskWorkersModule } from '@tasks/infrastructure/workers/task-workers.module';
import { TaskCacheService } from '@tasks/infrastructure/cache/task-cache.service';
import { GoalOwnershipAdapter } from '@tasks/infrastructure/adapters/goal-ownership.adapter';
import { GoalTitleAdapter } from '@tasks/infrastructure/adapters/goal-title.adapter';
import { HabitCapacityAdapter } from '@tasks/infrastructure/adapters/habit-capacity.adapter';
import { HABIT_CAPACITY_PORT } from '@tasks/domain/ports/habit-capacity.port';

// GoalMongoModule registers the 'Goal' mongoose model used by GoalOwnershipAdapter.
// HabitMongoModule registers Habit + HabitOccurrence models used by HabitCapacityAdapter.
import { GoalMongoModule } from '@goals/infrastructure/persistence/goal-mongo.module';
import { HabitMongoModule } from '@habits/infrastructure/persistence/habit-mongo.module';
import { AnalyticsWorkersModule } from '@analytics/infrastructure/workers/analytics-workers.module';
import { UserWorkersModule } from '@users/infrastructure/workers/user-workers.module';

@Module({
  imports: [
    SharedModule,
    TaskMongoModule,
    GoalMongoModule,
    HabitMongoModule,
    TaskWorkersModule,
    AnalyticsWorkersModule,
    UserWorkersModule,
  ],
  controllers: [TasksController],
  providers: [
    { provide: TASK_REPO_PORT, useClass: TaskRepository },
    { provide: GOAL_OWNERSHIP_PORT, useClass: GoalOwnershipAdapter },
    { provide: GOAL_TITLE_PORT, useClass: GoalTitleAdapter },
    { provide: HABIT_CAPACITY_PORT, useClass: HabitCapacityAdapter },
    TaskCacheService,
    { provide: TASK_CACHE_PORT, useExisting: TaskCacheService },
    CreateTaskService,
    UpdateTaskService,
    DeleteTaskService,
    GetTasksService,
  ],
})
export class TasksModule {}
