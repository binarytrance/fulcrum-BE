import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan, { StreamOptions } from 'morgan';
import cors from 'cors';
import { createHttpTerminator } from 'http-terminator';
import { Options, rateLimit } from 'express-rate-limit';
import compression, { CompressionOptions } from 'compression';
import { RedisStore } from 'connect-redis';
import { Redis } from 'ioredis';

import session, { SessionOptions } from 'express-session';
import { DatabaseError, logger, connectDB, closeDB } from '~/services';
import { errorHandler, responseHandler } from '~/app/middleware';
import { Server } from 'http';
import { env } from '~/data/env';
import { UserRoutes } from './routes/v1';

const app = express();
const compressionOptions: CompressionOptions = {
  level: 6,
  threshold: 1024,
};
const rateLimitingOptions: Partial<Options> = {
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
};
const redisClient: Redis = new Redis({
  host: env.STORAGE.REDIS_HOST,
  port: env.STORAGE.REDIS_PORT,
  password: env.STORAGE.REDIS_PASSWORD,
});
const sessionOptions: SessionOptions = {
  store: new RedisStore({ client: redisClient }),
  secret: env.APP.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.APP.NODE_ENV !== 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
};
const morganStreamOptions: StreamOptions = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(hpp());
app.use(cors());
app.use(morgan('combined', { stream: morganStreamOptions }));
app.use(rateLimit(rateLimitingOptions));
app.use(session(sessionOptions));

if (env.APP.NODE_ENV === 'production') {
  app.use(compression(compressionOptions));
} else {
  app.use(morgan('dev'));
}

app.use(responseHandler);
// v1 routes
app.use('/api/v1/users', UserRoutes);

app.use(errorHandler);

const terminateTasks = async (server: Server, exitCode: number = 0) => {
  const httpterminator = createHttpTerminator({ server });
  try {
    logger.info('Received shutdown signal');
    logger.info('closing database connection');
    await closeDB();
    logger.info('closing http server');
    await httpterminator.terminate();

    logger.info('shutdown complete');
    process.exit(exitCode);
  } catch (err) {
    logger.error('Error during shutdown', { err });
    process.exit(1);
  }
};

const handleShutdown = (server: Server) => {
  ['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, () => {
      logger.info(`Received ${signal}`);
      terminateTasks(server);
    });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncought expection', { message: err.message });
    terminateTasks(server, 1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
    terminateTasks(server, 1);
  });

  process.on('exit', (code) => {
    logger.info(`process exited with code: ${code}`);
  });
};

const bootstrap = async () => {
  try {
    await connectDB();
    logger.info('Database connection OK!');

    const server = app.listen(env.APP.PORT, env.APP.HOST, (err) => {
      if (err) {
        logger.error('Application failed to start', { message: err.message });
        process.exit(1);
      }
      logger.info(
        `Application started at http://${env.APP.HOST}:${env.APP.PORT}`,
      );
    });

    handleShutdown(server);
  } catch (err) {
    if (err instanceof DatabaseError) {
      const errors = err.serializeError();
      logger.error('DB Connection Failed', { errors });
    } else {
      logger.error('unexpected error while connecting to DB', { error: err });
    }
    process.exit(1);
  }
};

bootstrap();
