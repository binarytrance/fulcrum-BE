import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { UserTable } from './user';
import { GoalsTable } from './goals';
import { relations } from 'drizzle-orm';
import { TasksTable } from './tasks';

export const habitFrequencies = ['daily', 'weekly'] as const;
export type HabitFrequency = (typeof habitFrequencies)[number];
export const habitFrequencyEnum = pgEnum('habit_frequency', habitFrequencies);

export const HabitsTable = pgTable(
  'habits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => UserTable.id, {
      onDelete: 'cascade',
    }),
    goalId: uuid('goal_id').references(() => GoalsTable.id, {
      onDelete: 'set null',
    }),
    taskId: uuid('task_id').references(() => TasksTable.id, {
      onDelete: 'set null',
    }),
    title: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (habits) => [
    index('idx_user_id_goal_id').on(
      habits.userId,
      habits.goalId,
      habits.taskId,
    ),
  ],
);

export const habitsRelations = relations(HabitsTable, ({ one }) => ({
  goal: one(GoalsTable, {
    fields: [HabitsTable.goalId],
    references: [GoalsTable.id],
  }),
  user: one(UserTable, {
    fields: [HabitsTable.userId],
    references: [UserTable.id],
  }),
  task: one(TasksTable, {
    fields: [HabitsTable.userId],
    references: [TasksTable.id],
  }),
}));
