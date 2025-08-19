import { InferSelectModel } from 'drizzle-orm';
import { AuthAccountsTable } from '~/app/shared/services/db/drizzle';

export type IAuthAccount = InferSelectModel<typeof AuthAccountsTable>;
