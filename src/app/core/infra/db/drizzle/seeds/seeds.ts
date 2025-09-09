import 'reflect-metadata';
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
import { Pool } from 'pg';
import { Env } from '@shared/config';
import { drizzle } from 'drizzle-orm/node-postgres';

const env = new Env();

const pool = new Pool({
  user: env.database.DB_USER,
  password: env.database.DB_PASSWORD,
  host: env.database.DB_HOST,
  port: env.database.DB_PORT,
  database: env.database.DB_NAME,
});

const db = drizzle(pool);

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
