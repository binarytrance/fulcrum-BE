import { injectable } from 'tsyringe';
import { IAuthAccount, IPassword, IUser } from '@interfaces';
import { Database } from '@shared/services';
import { Logger } from '@shared/config';
import { DatabaseError } from '@shared/errors';
import {
  AuthAccountsTable,
  PasswordTable,
  UserTable,
} from '@core/infra/db/drizzle';
import { and, eq } from 'drizzle-orm';

@injectable()
export class AuthRepository {
  constructor(private readonly db: Database, private readonly logger: Logger) {}

  public async findLinkByProvider(
    authProvider: IAuthAccount['authProvider'],
    providerUserId: IAuthAccount['providerUserId']
  ) {
    try {
      const [row] = await this.db.connection
        .select()
        .from(AuthAccountsTable)
        .where(
          and(
            eq(AuthAccountsTable.authProvider, authProvider),
            eq(AuthAccountsTable.providerUserId, providerUserId)
          )
        )
        .limit(1);

      return row ?? null;
    } catch (err) {
      throw new DatabaseError('failed to find auth provider link');
    }
  }

  public async findUserProviderLink(
    userId: IAuthAccount['userId'],
    authProvider: IAuthAccount['authProvider']
  ) {
    try {
      const [row] = await this.db.connection
        .select()
        .from(AuthAccountsTable)
        .where(
          and(
            eq(AuthAccountsTable.userId, userId),
            eq(AuthAccountsTable.authProvider, authProvider)
          )
        )
        .limit(1);

      return row ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to fetch user auth provider link');
    }
  }

  public async updateLastLinkedAt(
    authId: IAuthAccount['id'],
    linkedAt: IAuthAccount['linkedAt']
  ) {
    try {
      await this.db.connection
        .update(AuthAccountsTable)
        .set({ linkedAt })
        .where(eq(AuthAccountsTable.id, authId));
    } catch (err) {
      throw new DatabaseError('insert into auth account failed', { err });
    }
  }

  public async createAuthProvider(
    userId: IAuthAccount['userId'],
    authProvider: IAuthAccount['authProvider'],
    providerUserId: IAuthAccount['providerUserId'],
    emailAtLink: IAuthAccount['emailAtLink']
  ) {
    try {
      const [authAccount] = await this.db.connection
        .insert(AuthAccountsTable)
        .values({
          userId,
          providerUserId,
          authProvider,
          emailAtLink,
        })
        .returning();

      return authAccount;
    } catch (err: any) {
      // unique violation: either already linked or same provider
      if (err?.code === '23505') {
        throw new DatabaseError('User already linked to another account');
      }

      throw new DatabaseError('insert into auth account failed');
    }
  }

  public async findPasswordByUserId(userId: IPassword['userId']) {
    try {
      const [storedPassword] = await this.db.connection
        .select()
        .from(PasswordTable)
        .where(eq(PasswordTable.userId, userId))
        .limit(1);

      return storedPassword;
    } catch (err) {
      throw new DatabaseError('failed to find existing userid', { err });
    }
  }

  public async findPasswordHashByEmail(email: IUser['email']) {
    try {
      const [row] = await this.db.connection
        .select({
          userId: UserTable.id,
          passwordHash: PasswordTable.passwordHash,
          name: UserTable.name,
          email: UserTable.email,
        })
        .from(UserTable)
        .leftJoin(PasswordTable, eq(PasswordTable.userId, UserTable.id))
        .where(eq(UserTable.email, email))
        .limit(1);

      return row;
    } catch (err) {
      throw new DatabaseError('failed to find existing user email', { err });
    }
  }

  public async createPassword(
    userId: IPassword['userId'],
    passwordHash: IPassword['passwordHash'],
    algo: IPassword['algo'],
    needsRehash: IPassword['needsRehash']
  ) {
    try {
      const [row] = await this.db.connection
        .insert(PasswordTable)
        .values({
          userId,
          passwordHash,
          needsRehash,
          algo,
        })
        .returning();

      return row;
    } catch (err) {
      throw new DatabaseError('failed to create password for user', { err });
    }
  }

  public async markNeedsRehash(
    userId: IPassword['userId'],
    needsRehash: IPassword['needsRehash']
  ) {
    try {
      await this.db.connection
        .update(PasswordTable)
        .set({ needsRehash })
        .where(eq(PasswordTable.userId, userId));
    } catch (err) {
      throw new DatabaseError('failed to mark rehash for the user', { err });
    }
  }

  public async updateHash(
    userId: IPassword['userId'],
    newHash: IPassword['passwordHash']
  ) {
    try {
      const [row] = await this.db.connection
        .update(PasswordTable)
        .set({ passwordHash: newHash })
        .where(eq(PasswordTable.userId, userId))
        .returning();

      return row;
    } catch (err) {
      throw new DatabaseError('failed to update the hash', { err });
    }
  }
}
