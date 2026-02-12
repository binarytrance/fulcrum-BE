import { ConfigService as NestConfigService } from '@nestjs/config';
import { Env } from './config.schema';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  constructor(private readonly config: NestConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv() {
    return this.get('NODE_ENV');
  }

  get port() {
    return this.get('PORT');
  }

  get mongoURL() {
    return this.get('MONGO_URL');
  }
}
