import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { GoalsTable } from './goals';
import { PasswordTable } from './password';
import { AuthAccountsTable } from './authAccounts';

export const UserTable = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  name: varchar('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userRelations = relations(UserTable, ({ one, many }) => ({
  goals: many(GoalsTable),
  password: one(PasswordTable, {
    fields: [UserTable.id],
    references: [PasswordTable.userId],
  }),
  accounts: many(AuthAccountsTable),
}));
