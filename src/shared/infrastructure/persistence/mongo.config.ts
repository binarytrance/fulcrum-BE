import { MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@shared/config/config.service';

export const createMongoConfig = (
  config: ConfigService,
): MongooseModuleOptions => {
  return {
    uri: config.mongo.uri,
    autoIndex: !config.isProd,
    retryAttempts: 5,
    retryDelay: 3000,
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
    writeConcern: {
      w: 'majority',
      j: true,
    },
  };
};
