import { eq } from 'drizzle-orm';
import { Request, Response } from 'express';
import { logger } from '~/app/services';
import { db, UserTable } from '~/drizzle';

const signInHandler = async (req: Request, res: Response) => {
  const { username } = req.body;
  const users = await db
    .select()
    .from(UserTable)
    .where(eq(UserTable.name, username));
  logger.info('user is', users[0]);
  const userResponse = {
    name: users[0].name,
    email: users[0].email,
    id: users[0].id,
  };
  res.success(userResponse, 'user exists', 200);
};

export { signInHandler };
