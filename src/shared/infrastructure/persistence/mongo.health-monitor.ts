import { Connection } from 'mongoose';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class MongoHealthMonitor implements OnModuleInit {
  private readonly logger = new Logger(MongoHealthMonitor.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    this.connection.on('connected', () => this.logger.log('MongoDB connected'));

    this.connection.on('error', (err) =>
      this.logger.error('MongoDB error', err),
    );

    this.connection.on('disconnected', () =>
      this.logger.warn('MongoDB disconnected'),
    );
  }
}
