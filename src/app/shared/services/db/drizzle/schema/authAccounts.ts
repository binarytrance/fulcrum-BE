import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { UserTable } from './user';
import { relations } from 'drizzle-orm';

export const authProviders = ['google', 'github', 'local'] as const;
export type AuthProviders = (typeof authProviders)[number];
export const authProvidersEnum = pgEnum('auth_providers', authProviders);

export const AuthAccountsTable = pgTable(
  'auth_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => UserTable.id, { onDelete: 'cascade' })
      .notNull(),
    authProvider: authProvidersEnum().notNull(),
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    emailAtLink: varchar('email_at_link', { length: 320 }),
    linkedAt: timestamp('linked_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (authAccounts) => [
    uniqueIndex('uniq_idx_auth_accounts_auth_provider_user').on(
      authAccounts.authProvider,
      authAccounts.providerUserId
    ),
    uniqueIndex('uniq_idx_auth_accounts_user_provider').on(
      authAccounts.userId,
      authAccounts.authProvider
    ),
    index('idx_auth_accounts_user').on(authAccounts.userId),
  ]
);

export const authAccountRelations = relations(AuthAccountsTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [AuthAccountsTable.userId],
    references: [UserTable.id],
  }),
}));
