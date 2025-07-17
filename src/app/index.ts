import express, { Application } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan, { StreamOptions } from 'morgan';
import cors from 'cors';
import { createHttpTerminator } from 'http-terminator';
import { Options, rateLimit } from 'express-rate-limit';
import compression, { CompressionOptions } from 'compression';
import { RedisStore } from 'connect-redis';
import session, { SessionOptions } from 'express-session';
import { Server } from 'http';

import { DatabaseError, logger, Database, RedisProvider } from '~/services';
import { middlewares } from '~/app/middleware';
import { env } from '~/data/env';
import { Routes } from '~/app/routes';

class App {
  public app: Application;
  private db: Database;
  private redisProvider: RedisProvider;
  private routes: Routes;
  private server?: Server;

  constructor() {
    this.app = express();
    this.db = Database.getInstance();
    this.redisProvider = RedisProvider.getInstance();
    this.routes = new Routes(this.app);
    this.initMiddleware();
    this.initRoutes();
    this.initErrorHandlers();
  }

  private initMiddleware() {
    const compressionOptions: CompressionOptions = {
      level: 6,
      threshold: 1024,
    };
    const rateLimitingOptions: Partial<Options> = {
      windowMs: 15 * 60 * 1000,
      limit: 50000,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    };
    const sessionOptions: SessionOptions = {
      store: new RedisStore({ client: this.redisProvider.client }),
      secret: env.APP.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: env.APP.NODE_ENV === 'production',
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

    this.app.use(express.json({ limit: '1024' }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(helmet());
    this.app.use(hpp());
    this.app.use(cors());
    this.app.use(morgan('combined', { stream: morganStreamOptions }));
    this.app.use(rateLimit(rateLimitingOptions));
    this.app.use(session(sessionOptions));
    this.app.use(compression(compressionOptions));
    this.app.use(morgan('dev'));
    this.app.use(middlewares.responseMiddleware.sendFormattedResponse);
  }

  private initRoutes() {
    this.routes.swaggerDocRoute();
    this.routes.healthRoute();
    this.routes.v1Routes();
    this.routes.notFoundRoute();
  }

  private initErrorHandlers() {
    // Centralized error handling
    this.app.use(middlewares.errorMiddleware.errorHandler);
  }

  private async shutdown(exitCode = 0) {
    if (!this.server) return;
    const httpTerminator = createHttpTerminator({ server: this.server });

    try {
      logger.info('Graceful shutdown: closing DB, Redis, HTTP server');
      await this.db.close();
      await this.redisProvider.close();
      await httpTerminator.terminate();
      logger.info('Shutdown complete');
      process.exit(exitCode);
    } catch (err) {
      logger.error('Error during shutdown', { err });
      process.exit(1);
    }
  }

  private setupProcessHandlers() {
    ['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, shutting down...`);
        this.shutdown();
      });
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception', {
        message: err.message,
        stack: err.stack,
      });
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection', { reason });
      this.shutdown(1);
    });

    process.on('exit', (code) => {
      logger.info(`Process exited with code: ${code}`);
    });
  }

  private async connectDB() {
    try {
      await this.db.connect();
      logger.info('Database connection OK!');
      await this.redisProvider.ping();
      logger.info('Redis connection OK!');
    } catch (err) {
      if (err instanceof DatabaseError) {
        logger.error('DB Connection Failed', { errors: err.serializeError() });
      } else {
        logger.error('Unexpected error while connecting to DB', { error: err });
      }

      this.shutdown(1);
    }
  }

  private listenServer() {
    this.server = this.app.listen(env.APP.PORT, env.APP.HOST, (err?: Error) => {
      if (err) {
        logger.error('Application failed to start', {
          message: err.message,
        });
        process.exit(1);
      }
      logger.info(
        `Application started at http://${env.APP.HOST}:${env.APP.PORT}`,
      );
    });
  }

  public async bootstrap() {
    this.setupProcessHandlers();
    this.connectDB();
    this.listenServer();
  }
}

const app = new App();
app.bootstrap();
