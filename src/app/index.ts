import 'reflect-metadata';
import { container } from 'tsyringe';
import { createHttpTerminator } from 'http-terminator';
import { registerContainers, Tokens } from '@core/di';
import { FulcrumServer } from '@core/http';

async function bootstrap() {
  registerContainers();
  const fulcrumServer = container.resolve(FulcrumServer);

  await fulcrumServer.setupDatabase();
  fulcrumServer.setupMiddlewareAndRoutes();
  const createdServer = fulcrumServer.setupServer();

  const terminator = createHttpTerminator({ server: createdServer });
  fulcrumServer.setupProcessHandlers(terminator);
}

bootstrap().catch((err) => {
  console.error('app bootstrap failed', err);
  process.exit(1);
});
