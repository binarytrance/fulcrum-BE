import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './shared/config/config.service';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  await app.listen(config.port);
}

bootstrap();
