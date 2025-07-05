import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { GoalsTable } from './goals';

export const UserTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email').notNull().unique(),
  name: varchar('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userRelations = relations(UserTable, ({ many }) => ({
  goals: many(GoalsTable),
}));
