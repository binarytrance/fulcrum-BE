export const TRANSACTION_MANAGER_PORT = 'TRANSACTION_MANAGER_PORT';

export interface ITransactionManager {
  withTransaction<T>(work: () => Promise<T>): Promise<T>;
}
