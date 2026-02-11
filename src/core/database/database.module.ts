import { Logger, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '../config/config.service';
import { Connection } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
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
          connectionFactory: (connection: Connection): Connection => {
            const logger = new Logger('MongoDB');

            connection.on('connected', () => {
              logger.log('MongoDB connected');
            });

            connection.on('error', (error) => {
              logger.error('MongoDB connection error', error);
            });

            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected');
            });

            return connection;
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
