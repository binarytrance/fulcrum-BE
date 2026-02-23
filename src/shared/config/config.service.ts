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

  get mongo() {
    return {
      uri: this.get('MONGO_URL'),
      dbName: this.get('MONGO_DB_NAME'),
    };
  }

  get isProd() {
    return this.get('NODE_ENV') === 'production';
  }

  get tokenSecrets() {
    return {
      jwtAccessSecret: this.get('JWT_ACCESS_SECRET'),
      jwtRefreshSecret: this.get('JWT_REFRESH_SECRET'),
    };
  }

  get email() {
    return {
      senderEmail: this.get('SENDER_EMAIL'),
      senderEmailPassword: this.get('SENDER_EMAIL_PASSWORD'),
      sendgridApiKey: this.get('SENDGRID_API_KEY'),
      sendgridSender: this.get('SENDGRID_SENDER'),
    };
  }

  get google() {
    return {
      clientID: this.get('GOOGLE_CLIENT_ID'),
      clientSecret: this.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: this.get('GOOGLE_CALLBACK_URL'),
    };
  }

  get github() {
    return {
      clientID: this.get('GITHUB_CLIENT_ID'),
      clientSecret: this.get('GITHUB_CLIENT_SECRET'),
      callbackURL: this.get('GITHUB_CALLBACK_URL'),
    };
  }

  get redis() {
    return {
      host: this.get('REDIS_HOST'),
      port: this.get('REDIS_PORT'),
      username: this.get('REDIS_USERNAME'),
      password: this.get('REDIS_PASSWORD'),
    };
  }
}
