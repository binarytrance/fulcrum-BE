import { UserTable } from '@core/infra/db/drizzle';
import { InferSelectModel } from 'drizzle-orm';

export type IUser = InferSelectModel<typeof UserTable>;
