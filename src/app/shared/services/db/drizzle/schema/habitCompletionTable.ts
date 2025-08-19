import {
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { HabitSchedulesTable } from './habitSchedules';
import { UserTable } from './user';
import { relations } from 'drizzle-orm';

export const habitCompletionStatuses = ['completed', 'scheduled'] as const;
export type HabitCompletionStatus = (typeof habitCompletionStatuses)[number];
export const habitComletionEnum = pgEnum(
  'habit_completion_status',
  habitCompletionStatuses,
);

export const HabitCompletionTable = pgTable(
  'habit_completions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    habitScheduleId: uuid('habit_schedule_id')
      .notNull()
      .references(() => HabitSchedulesTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => UserTable.id),
    completionDate: timestamp('completion_date', {
      withTimezone: true,
    }).notNull(),
    description: text('description'),
    status: habitComletionEnum(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (habitCompletions) => [
    index('idx_habit_completion_habit_id_habit_schedule_id_user_id').on(
      habitCompletions.userId,
      habitCompletions.habitScheduleId,
    ),
  ],
);

export const habitCompletionsRelations = relations(
  HabitCompletionTable,
  ({ one }) => ({
    user: one(UserTable, {
      fields: [HabitCompletionTable.userId],
      references: [UserTable.id],
    }),
    habitSchedule: one(HabitSchedulesTable, {
      fields: [HabitCompletionTable.habitScheduleId],
      references: [HabitSchedulesTable.id],
    }),
  }),
);
