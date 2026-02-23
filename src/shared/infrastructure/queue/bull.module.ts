import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { Module } from '@nestjs/common';
import { BullModule as NestBullModule } from '@nestjs/bullmq';

import { ConfigModule } from '@shared/config/config.module';
import { ConfigService } from '@shared/config/config.service';
import { createBullConfig } from '@shared/infrastructure/queue/bull.config';

@Module({
  imports: [
    ConfigModule,
    NestBullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createBullConfig,
    }),
    NestBullModule.registerQueue({ name: 'email' }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
  ],
})
export class BullModule {}
