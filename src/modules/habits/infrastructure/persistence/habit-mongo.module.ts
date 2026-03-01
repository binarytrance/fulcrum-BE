import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Habit,
  HabitSchema,
} from '@habits/infrastructure/persistence/habit.schema';
import {
  HabitOccurrence,
  HabitOccurrenceSchema,
} from '@habits/infrastructure/persistence/habit-occurrence.schema';
import { HabitRepository } from '@habits/infrastructure/persistence/habit.repository';
import { HabitOccurrenceRepository } from '@habits/infrastructure/persistence/habit-occurrence.repository';

export const habitMongoFeature = MongooseModule.forFeature([
  { name: Habit.name, schema: HabitSchema },
  { name: HabitOccurrence.name, schema: HabitOccurrenceSchema },
]);

@Module({
  imports: [habitMongoFeature],
  providers: [HabitRepository, HabitOccurrenceRepository],
  exports: [habitMongoFeature, HabitRepository, HabitOccurrenceRepository],
})
export class HabitMongoModule {}
