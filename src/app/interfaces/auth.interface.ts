import { InferSelectModel } from 'drizzle-orm';
import z from 'zod';
import { AuthAccountsTable, PasswordTable } from '@core/infra/db/drizzle';
import { loginSchema, signUpSchema } from '@schemas';

export type IAuthAccount = InferSelectModel<typeof AuthAccountsTable>;

export type PassportInfo = {
  message: string;
};

export type IVerifyCallback = (
  err: Error | null,
  user?: Express.User,
  info?: PassportInfo
) => void;

export type ISignup = z.infer<typeof signUpSchema>;

export type ILogin = z.infer<typeof loginSchema>;

export type IPassword = InferSelectModel<typeof PasswordTable>;
