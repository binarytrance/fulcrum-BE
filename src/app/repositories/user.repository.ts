import { injectable } from 'tsyringe';
import { eq } from 'drizzle-orm';
import { Database } from '@core/infra';
import { IUser } from '@interfaces';
import { DatabaseError } from '@shared/errors';
import { UserTable } from '@core/infra/db/drizzle';

@injectable()
export class UserRepository {
  constructor(private readonly db: Database) {}

  public async findById(id: IUser['id']) {
    try {
      const [user] = await this.db.connection
        .select()
        .from(UserTable)
        .where(eq(UserTable.id, id))
        .limit(1);
      return user ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find user by id', { err });
    }
  }

  public async findByEmail(email: IUser['email']) {
    try {
      const [user] = await this.db.connection
        .select()
        .from(UserTable)
        .where(eq(UserTable.email, email))
        .limit(1);
      return user ?? null;
    } catch (err) {
      throw new DatabaseError('Failed to find user by email', { err });
    }
  }

  public async create(email: IUser['email'], name: IUser['name']) {
    try {
      const [user] = await this.db.connection
        .insert(UserTable)
        .values({ email, name })
        .returning();
      return user;
    } catch (err) {
      throw new DatabaseError('Failed to create user', { err });
    }
  }
}
