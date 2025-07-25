import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { LoginBody } from '~/app/schema';
import {
  DatabaseError,
  InternalServerError,
  UnAuthorizedError,
} from '~/app/services';
import { env } from '~/data/env';
import { db, UserTable } from '~/drizzle';

export class UserController {
  constructor() {}

  public async loginHandler(req: Request<{}, {}, LoginBody>, res: Response) {
    try {
      const username = req.body.username;
      const users = await db
        .select({
          name: UserTable.name,
          email: UserTable.email,
          id: UserTable.id,
        })
        .from(UserTable)
        .where(eq(UserTable.name, username));

      if (!users.length) {
        throw new UnAuthorizedError();
      }

      // add the user to the session
      req.session.user = { id: users[0].id, name: users[0].name };
      return res.success(users[0], 'user exists', 200);
    } catch (err) {
      throw new DatabaseError();
    }
  }

  public async logoutHandler(req: Request, res: Response) {
    req.session.destroy((err) => {
      if (err) {
        throw new InternalServerError();
      }
    });
    res.clearCookie(env.APP.SESSION_NAME);
    res.success(null, 'user logged out', 200);
  }
}
