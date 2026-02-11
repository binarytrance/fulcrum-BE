import { Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService,
} from '@nestjs/config';
import { envSchema } from './config.schema';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
