import { ConfigService } from '@shared/config/config.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { createMongoConfig } from './mongo.config';
import { MongoHealthMonitor } from './mongo.health-monitor';
import { ConfigModule } from '@shared/config/config.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createMongoConfig,
    }),
  ],
  providers: [MongoHealthMonitor],
})
export class MongoModule {}
