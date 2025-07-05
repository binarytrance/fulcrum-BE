import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { GoalsTable } from './goals';
import { relations } from 'drizzle-orm';

export const taskStatuses = [
  'planned',
  'in-progress',
  'completed',
  'paused',
] as const;
export type TaskStatus = (typeof taskStatuses)[number];
export const taskStatusesEnum = pgEnum('task_status', taskStatuses);

export const TasksTable = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id').references(() => GoalsTable.id, {
      onDelete: 'cascade',
    }),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatusesEnum(),
    estimate: timestamp('date', { withTimezone: true }).notNull(),
    progress: integer('progress').default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (tasks) => [index('idx_user_id_goal_id_habit_id').on(tasks.goalId)],
);

export const TasksRelations = relations(TasksTable, ({ one }) => ({
  goal: one(GoalsTable, {
    fields: [TasksTable.goalId],
    references: [GoalsTable.id],
  }),
}));
