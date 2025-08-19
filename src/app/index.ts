import 'reflect-metadata';
import { container } from 'tsyringe';
import { registerContainers, Tokens } from '~/app/core/di';
import { FulcrumServer } from '~/app/core/http';
import { createHttpTerminator } from 'http-terminator';

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
