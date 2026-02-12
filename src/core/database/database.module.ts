import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@core/config/config.service';
import { Connection } from 'mongoose';
import { ConfigModule } from '@core/config/config.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          uri: config.mongoURL,
          autoIndex: config.nodeEnv !== 'production',
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,

          // Optional but useful
          retryWrites: true,
          w: 'majority',
          connectionFactory: async (
            connection: Connection,
          ): Promise<Connection> => {
            const logger = new Logger('MongoDB');
            await connection.asPromise();
            logger.log('MongoDB connected');
            return connection;
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
