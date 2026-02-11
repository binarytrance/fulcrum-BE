import { ConfigService as NestConfigService } from '@nestjs/config';
import { Env } from './config.schema';

export class ConfigService {
  constructor(private readonly config: NestConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv() {
    return this.get('NODE_ENV');
  }

  get port() {
    return this.get('APP_PORT');
  }

  get mongoURL() {
    return this.get('MONGO_URL');
  }
}
