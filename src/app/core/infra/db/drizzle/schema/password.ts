import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { UserTable } from './user';
import { relations } from 'drizzle-orm';

export const PasswordTable = pgTable(
  'password',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => UserTable.id, { onDelete: 'cascade' }),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    algo: varchar('algo', { length: 50 }).notNull().default('argon2id'),
    needsRehash: boolean('needs_rehash').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (password) => [index('uniq_idx_password_user').on(password.userId)]
);

export const passwordRelations = relations(PasswordTable, ({ one }) => ({
  user: one(UserTable, {
    fields: [PasswordTable.userId],
    references: [UserTable.id],
  }),
}));
