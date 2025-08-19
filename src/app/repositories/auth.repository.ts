import { injectable } from 'tsyringe';
import { IAuthAccount } from '~/app/interfaces/auth.interface';
import { Database } from '~/app/shared/services';
import { Logger } from '~/app/shared/config';
import { DatabaseError } from '~/app/shared/errors';
import { AuthAccountsTable } from '../shared/services/db/drizzle';
import { and, eq } from 'drizzle-orm';

@injectable()
export class AuthRepository {
  constructor(private readonly db: Database, private readonly logger: Logger) {}

  public async getUserByProvider(
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

      return row;
    } catch (err) {
      throw new DatabaseError('fetch user by provider failed');
    }
  }

  public async insertAuthAccount(
    userId: IAuthAccount['userId'],
    authProvider: IAuthAccount['authProvider'],
    providerUserId: IAuthAccount['providerUserId'],
    emailAtLink: IAuthAccount['emailAtLink']
  ) {
    try {
      await this.db.connection.insert(AuthAccountsTable).values({
        userId,
        providerUserId,
        authProvider,
        emailAtLink,
      });
    } catch (err) {
      throw new DatabaseError('insert into auth account failed');
    }
  }
}
