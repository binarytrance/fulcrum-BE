import { Application } from 'express';
import { inject, injectable } from 'tsyringe';
import { Tokens } from '@core/di';
import { HttpTerminator } from 'http-terminator';
import { IncomingMessage, Server, ServerResponse } from 'http';
import helmet from 'helmet';
import hpp from 'hpp';
import cors from 'cors';
import compression, { CompressionOptions } from 'compression';
import rateLimit, { Options } from 'express-rate-limit';
import { SessionOptions } from 'express-session';
import { RedisStore } from 'connect-redis';
import expressSession from 'express-session';
import express from 'express';
import morgan, { StreamOptions } from 'morgan';
import { DateTime } from 'luxon';
import passport from 'passport';
import {
  GlobalErrorHandlerMiddleware,
  GlobalResponseHandlerMiddleware,
} from '@shared/middlewares';
import { AppRouter } from '@core/router';
import {
  GithhubStrategy,
  LocalStrategy,
  GoogleStrategy,
} from '@shared/services';
import { Database, Redis } from '@core/infra';
import { DatabaseError } from '@shared/errors';
import { Logger, Env } from '@shared/config';

@injectable()
export class FulcrumServer {
  constructor(
    @inject(Tokens.APP) private readonly app: Application,
    private readonly logger: Logger,
    private readonly env: Env,
    private readonly globalErrorHandler: GlobalErrorHandlerMiddleware,
    private readonly globalResponseHandler: GlobalResponseHandlerMiddleware,
    private readonly appRouter: AppRouter,
    private readonly db: Database,
    private readonly redis: Redis,
    private readonly githubStrategy: GithhubStrategy,
    private readonly localStrategy: LocalStrategy,
    private readonly googleStrategy: GoogleStrategy
  ) {}

  public setupMiddlewareAndRoutes() {
    this.setupSecurityMiddleWare();
    this.setupStandardMiddleware();
    this.setupAuth();
    this.setupGlobalResponseHandler();
    this.setupRoutes();
    this.setupGlobalErrorHandler();
  }

  public async setupDatabase() {
    try {
      await this.db.checkConnection();
      this.logger.info('postgresql connection ok!');
      await this.redis.checkConnection();
      this.logger.info('redis connection ok!');
      this.redis.wireEvents();
    } catch (err) {
      if (err instanceof DatabaseError) {
        this.logger.error('postgresql connection failed', {
          err: err.serializeError(),
        });
      } else {
        this.logger.error('Unexpected error while connecting to DB', { err });
      }
    }
  }

  public setupServer(): Server<typeof IncomingMessage, typeof ServerResponse> {
    return this.app.listen(
      this.env.app.PORT,
      this.env.app.HOST,
      (err?: Error) => {
        if (err) {
          this.logger.error('Server failed to start', {
            err: err.message,
          });
        } else {
          this.logger.info(
            `Application started on http://${this.env.app.HOST}:${this.env.app.PORT}`
          );
        }
      }
    );
  }

  private async shutdown(
    httpTerminator: HttpTerminator,
    exitCode = 0
  ): Promise<void> {
    try {
      this.logger.info('Graceful shutdown: closing DB, Redis, HTTP server');
      await this.db.end();
      await this.redis.end();
      await httpTerminator.terminate();
      this.logger.info('Shutdown complete');
      process.exit(exitCode);
    } catch (err) {
      this.logger.error('Error during shutdown', { err });
      process.exit(1);
    }
  }

  public setupProcessHandlers(httpTerminator: HttpTerminator): void {
    ['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
      process.on(signal, () => {
        this.logger.info(`Received ${signal}, shutting down...`);
        this.shutdown(httpTerminator);
      });
    });

    process.on('uncaughtException', (err) => {
      this.logger.error('Uncaught Exception', {
        message: err.message,
        stack: err.stack,
      });
      this.shutdown(httpTerminator, 1);
    });

    process.on('unhandledRejection', (reason) => {
      this.logger.error('Unhandled Rejection', { reason });
      this.shutdown(httpTerminator, 1);
    });

    process.on('exit', (code) => {
      this.logger.info(`Process exited with code: ${code}`);
    });
  }

  private setupRoutes(): void {
    this.appRouter.loadGoalsRoutes(this.app);
  }

  private setupSecurityMiddleWare(): void {
    this.app.set('trust-proxy', 1);
    this.app.use(helmet());
    this.app.use(hpp());
    this.app.use(cors());
  }

  private setupStandardMiddleware(): void {
    const rateLimitingOptions: Partial<Options> = {
      windowMs: 15 * 60 * 1000,
      limit: 50000,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    };
    const compressionOptions: CompressionOptions = {
      level: 6,
      threshold: 1024,
    };
    const store = new RedisStore({ client: this.redis.connection });
    const sessionOptions: SessionOptions = {
      store,
      secret: this.env.app.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: this.env.app.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      },
    };
    const stream: StreamOptions = {
      write: (message: string) => {
        const localTime = DateTime.local().toFormat('yyyy-LL-dd HH:mm:ss');
        this.logger.info(`[${localTime}] ${message.trim()}`);
      },
    };

    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    this.app.use(compression(compressionOptions));
    this.app.use(rateLimit(rateLimitingOptions));
    this.app.use(expressSession(sessionOptions));
    this.app.use(morgan('combined', { stream }));
  }

  private setupAuth(): void {
    this.githubStrategy.configure();
    this.localStrategy.configure();
    this.googleStrategy.configure();

    this.app.use(passport.initialize());
    this.app.use(passport.session());
  }

  private setupGlobalResponseHandler(): void {
    this.globalResponseHandler.register(this.app);
  }

  private setupGlobalErrorHandler(): void {
    this.globalErrorHandler.register(this.app);
  }
}
