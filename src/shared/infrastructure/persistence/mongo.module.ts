import { ConfigService } from '@shared/config/config.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { createMongoConfig } from './mongo.config';
import { MongoHealthMonitor } from './mongo.health-monitor';
import { ConfigModule } from '@shared/config/config.module';
import { MongoTransactionManager } from './mongo-transaction.manager';
import { TRANSACTION_MANAGER_PORT } from '@shared/domain/ports/transaction-manager.port';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createMongoConfig,
    }),
  ],
  providers: [
    MongoHealthMonitor,
    { provide: TRANSACTION_MANAGER_PORT, useClass: MongoTransactionManager },
  ],
  exports: [TRANSACTION_MANAGER_PORT],
})
export class MongoModule {}
