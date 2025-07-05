import { db } from '../db';
import {
  UserTable,
  GoalsTable,
  HabitsTable,
  HabitSchedulesTable,
  HabitCompletionTable,
  TasksTable,
} from '../schema';
import { users } from './users';
import { goals } from './goals';
import { tasks } from './tasks';
import { habitSchedules } from './habitSchedules';
import { habits } from './habits';
import { habitCompletions } from './habitCompletions';

async function cleanUp() {
  await db.delete(UserTable);
  await db.delete(GoalsTable);
  await db.delete(HabitsTable);
  await db.delete(TasksTable);
  await db.delete(HabitSchedulesTable);
  await db.delete(HabitCompletionTable);
}

async function seed() {
  await cleanUp();

  await db.insert(UserTable).values(users);
  await db.insert(GoalsTable).values(goals);
  await db.insert(TasksTable).values(tasks);
  await db.insert(HabitsTable).values(habits);
  await db.insert(HabitSchedulesTable).values(habitSchedules);
  await db.insert(HabitCompletionTable).values(habitCompletions);

  console.log('✅ Seed completed');
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
