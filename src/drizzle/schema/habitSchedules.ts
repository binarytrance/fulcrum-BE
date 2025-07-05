import { relations, sql } from 'drizzle-orm';
import {
  index,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { HabitsTable } from './habits';
import { TasksTable } from './tasks';
import { HabitCompletionTable } from './habitCompletionTable';

export const daysOfWeek = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;
export type DayOfWeek = (typeof daysOfWeek)[number];

export const HabitSchedulesTable = pgTable(
  'habit_schedules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    habitId: uuid('habit_id').references(() => HabitsTable.id, {
      onDelete: 'cascade',
    }),
    taskId: uuid('task_id').references(() => TasksTable.id, {
      onDelete: 'set null',
    }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }),
    duration: time('duration').notNull(),
    description: text('description'),
    daysOfWeek: varchar('habit_schedules_days_of_week')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (habitSchedules) => [
    index('idx_habit_schedules_habit_id_task_id').on(
      habitSchedules.taskId,
      habitSchedules.habitId,
    ),
  ],
);

export const habitSchedulesRelations = relations(
  HabitSchedulesTable,
  ({ many, one }) => ({
    habit: one(HabitsTable, {
      fields: [HabitSchedulesTable.habitId],
      references: [HabitsTable.id],
    }),
    task: one(TasksTable, {
      fields: [HabitSchedulesTable.taskId],
      references: [TasksTable.id],
    }),
    habitCompletions: many(HabitCompletionTable),
  }),
);
