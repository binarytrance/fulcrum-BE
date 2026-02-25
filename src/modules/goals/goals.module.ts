import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { GoalsController } from '@goals/presentation/controllers/goals.controller';
import { CreateGoalService } from '@goals/application/services/create-goal.service';
import { UpdateGoalService } from '@goals/application/services/update-goal.service';
import { DeleteGoalService } from '@goals/application/services/delete-goal.service';
import { GetGoalsService } from '@goals/application/services/get-goals.service';
import { GOAL_REPO_PORT } from '@goals/domain/ports/goal-repo.port';
import { GoalRepository } from '@goals/infrastructure/persistence/goal.repository';
import { GoalMongoModule } from '@goals/infrastructure/persistence/goal-mongo.module';
import { GoalWorkersModule } from '@goals/infrastructure/workers/goal-workers.module';
import { GoalCacheService } from '@goals/infrastructure/cache/goal-cache.service';

@Module({
  imports: [SharedModule, GoalMongoModule, GoalWorkersModule],
  controllers: [GoalsController],
  providers: [
    { provide: GOAL_REPO_PORT, useClass: GoalRepository },
    GoalCacheService,
    CreateGoalService,
    UpdateGoalService,
    DeleteGoalService,
    GetGoalsService,
  ],
})
export class GoalsModule {}
