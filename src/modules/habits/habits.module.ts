import { Module } from '@nestjs/common';
import { SharedModule } from '@shared/shared.module';
import { GoalMongoModule } from '@goals/infrastructure/persistence/goal-mongo.module';
import { HabitMongoModule } from '@habits/infrastructure/persistence/habit-mongo.module';
import { HabitWorkersModule } from '@habits/infrastructure/workers/habit-workers.module';
import { GoalAccessAdapter } from '@habits/infrastructure/adapters/goal-access.adapter';
import { HabitsController } from '@habits/presentation/controllers/habits.controller';

import { HABIT_REPO_PORT } from '@habits/domain/ports/habit-repo.port';
import { HABIT_OCCURRENCE_REPO_PORT } from '@habits/domain/ports/habit-occurrence-repo.port';
import { GOAL_ACCESS_PORT } from '@habits/domain/ports/goal-access.port';
import { HabitRepository } from '@habits/infrastructure/persistence/habit.repository';
import { HabitOccurrenceRepository } from '@habits/infrastructure/persistence/habit-occurrence.repository';

import { CreateHabitService } from '@habits/application/services/create-habit.service';
import { GetHabitsService } from '@habits/application/services/get-habits.service';
import { UpdateHabitService } from '@habits/application/services/update-habit.service';
import { DeleteHabitService } from '@habits/application/services/delete-habit.service';
import { CompleteOccurrenceService } from '@habits/application/services/complete-occurrence.service';
import { SkipOccurrenceService } from '@habits/application/services/skip-occurrence.service';
import { GetAnalyticsService } from '@habits/application/services/get-analytics.service';
import { GetOccurrencesService } from '@habits/application/services/get-occurrences.service';

@Module({
  imports: [
    SharedModule,
    HabitMongoModule,
    HabitWorkersModule,
    // GoalMongoModule registers the 'Goal' Mongoose model used by GoalAccessAdapter.
    GoalMongoModule,
  ],
  controllers: [HabitsController],
  providers: [
    // ─── Port bindings ─────────────────────────────────────────────────────
    { provide: HABIT_REPO_PORT, useExisting: HabitRepository },
    {
      provide: HABIT_OCCURRENCE_REPO_PORT,
      useExisting: HabitOccurrenceRepository,
    },
    { provide: GOAL_ACCESS_PORT, useClass: GoalAccessAdapter },

    // ─── Application services ──────────────────────────────────────────────
    CreateHabitService,
    GetHabitsService,
    UpdateHabitService,
    DeleteHabitService,
    CompleteOccurrenceService,
    SkipOccurrenceService,
    GetAnalyticsService,
    GetOccurrencesService,
  ],
})
export class HabitsModule {}
