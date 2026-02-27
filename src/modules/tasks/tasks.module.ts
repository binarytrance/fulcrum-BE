import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';

import { TasksController } from '@tasks/presentation/controllers/tasks.controller';

import { CreateTaskService } from '@tasks/application/services/create-task.service';
import { UpdateTaskService } from '@tasks/application/services/update-task.service';
import { CompleteTaskService } from '@tasks/application/services/complete-task.service';
import { DeleteTaskService } from '@tasks/application/services/delete-task.service';
import { GetTasksService } from '@tasks/application/services/get-tasks.service';

import { TASK_REPO_PORT } from '@tasks/domain/ports/task-repo.port';
import { GOAL_OWNERSHIP_PORT } from '@tasks/domain/ports/goal-ownership.port';
import { TaskRepository } from '@tasks/infrastructure/persistence/task.repository';
import { TaskMongoModule } from '@tasks/infrastructure/persistence/task-mongo.module';
import { TaskWorkersModule } from '@tasks/infrastructure/workers/task-workers.module';
import { TaskCacheService } from '@tasks/infrastructure/cache/task-cache.service';
import { GoalOwnershipAdapter } from '@tasks/infrastructure/adapters/goal-ownership.adapter';

// GoalMongoModule registers the 'Goal' mongoose model used by GoalOwnershipAdapter.
// This is the only cross-module infrastructure dependency in the tasks module.
import { GoalMongoModule } from '@goals/infrastructure/persistence/goal-mongo.module';

@Module({
  imports: [SharedModule, TaskMongoModule, GoalMongoModule, TaskWorkersModule],
  controllers: [TasksController],
  providers: [
    { provide: TASK_REPO_PORT, useClass: TaskRepository },
    { provide: GOAL_OWNERSHIP_PORT, useClass: GoalOwnershipAdapter },
    TaskCacheService,
    CreateTaskService,
    UpdateTaskService,
    CompleteTaskService,
    DeleteTaskService,
    GetTasksService,
  ],
})
export class TasksModule {}
