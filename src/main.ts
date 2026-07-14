import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from './shared/config/config.service';
import { VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const AUTH_RATE_LIMIT_PATHS = [
  '/api/v1/auth/signup',
  '/api/v1/auth/signin',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/oauth/exchange',
  '/api/v1/auth/refresh',
];

function isAuthRateLimitedPath(path: string): boolean {
  return AUTH_RATE_LIMIT_PATHS.some((authPath) => path.startsWith(authPath));
}

function createRateLimiter(windowMs: number, limit: number, message: string) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });
}

function basicAuth(config: ConfigService, realm: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      res.status(401).send('Authentication required.');
      return;
    }

    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'utf8',
    );
    const separatorIndex = credentials.indexOf(':');

    if (separatorIndex === -1) {
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      res.status(401).send('Invalid credentials.');
      return;
    }

    const username = credentials.slice(0, separatorIndex);
    const password = credentials.slice(separatorIndex + 1);

    if (
      username !== config.swagger.username ||
      password !== config.swagger.password
    ) {
      res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
      res.status(401).send('Invalid credentials.');
      return;
    }

    next();
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    AUTH_RATE_LIMIT_PATHS,
    createRateLimiter(
      config.authRateLimit.windowMs,
      config.authRateLimit.maxRequests,
      'Too many authentication attempts. Please try again later.',
    ),
  );
  app.use(
    '/api',
    rateLimit({
      windowMs: config.rateLimit.windowMs,
      limit: config.rateLimit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) =>
        req.path === '/v1/health' || isAuthRateLimitedPath(req.originalUrl),
      message: {
        message: 'Too many requests. Please try again later.',
      },
    }),
  );

  app.enableCors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fulcrum API')
    .setDescription('API documentation for the Fulcrum')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addCookieAuth(
      'refresh_token',
      { type: 'apiKey', in: 'cookie' },
      'refresh-token-cookie',
    )
    .build();

  if (config.isProd && config.swagger.hasCredentials) {
    const docsAuth = basicAuth(config, 'Fulcrum API Docs');
    const queuesAuth = basicAuth(config, 'Fulcrum Queue Dashboard');
    app.use('/docs', docsAuth);
    app.use('/docs-json', docsAuth);
    app.use('/queues', queuesAuth);

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  } else if (!config.isProd) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  app.enableShutdownHooks();
  await app.listen(config.port);
}

void bootstrap();
