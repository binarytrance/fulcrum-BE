import { AsyncLocalStorage } from 'async_hooks';
import type { ClientSession } from 'mongoose';

export const mongoSessionContext = new AsyncLocalStorage<ClientSession>();
