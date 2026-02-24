import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ITransactionManager } from '@shared/domain/ports/transaction-manager.port';
import { mongoSessionContext } from './mongo-session.context';

@Injectable()
export class MongoTransactionManager implements ITransactionManager {
  private readonly logger = new Logger(MongoTransactionManager.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async withTransaction<T>(work: () => Promise<T>): Promise<T> {
    let session;
    try {
      session = await this.connection.startSession();
    } catch (error) {
      this.logger.error('Failed to start MongoDB session', error);
      throw error;
    }

    try {
      const result = await session.withTransaction(() =>
        mongoSessionContext.run(session, work),
      );
      return result as T;
    } catch (error) {
      this.logger.error(
        'Transaction aborted',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    } finally {
      await session.endSession().catch((endError: unknown) => {
        this.logger.warn(
          'Failed to end session cleanly',
          endError instanceof Error ? endError.message : endError,
        );
      });
    }
  }
}
