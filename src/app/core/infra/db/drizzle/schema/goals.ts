import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { UserTable } from './user';
import { relations } from 'drizzle-orm';
import { TasksTable } from './tasks';

export const goalStatuses = [
  'not-started',
  'in-progress',
  'completed',
  'paused',
] as const;
export type GoalStatus = (typeof goalStatuses)[number];
export const goalStatusesEnum = pgEnum('goal_status', goalStatuses);

export const GoalsTable = pgTable(
  'goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => UserTable.id, {
        onDelete: 'cascade',
      })
      .notNull(),
    title: text('title').notNull(),
    description: text('description'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    status: goalStatusesEnum().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (goals) => [index('idx_goals_user_status').on(goals.userId, goals.status)]
);

export const goalRelations = relations(GoalsTable, ({ one, many }) => ({
  habits: many(TasksTable),
  user: one(UserTable, {
    fields: [GoalsTable.userId],
    references: [UserTable.id],
  }),
}));
