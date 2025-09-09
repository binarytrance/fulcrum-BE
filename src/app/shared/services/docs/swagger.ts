import swaggerJSDocs from 'swagger-jsdoc';
import { singleton } from 'tsyringe';
import { Env } from '@shared/config';

@singleton()
export class Swagger {
  constructor(private readonly env: Env) {}

  public configure() {
    const options: swaggerJSDocs.Options = {
      definition: {
        swagger: '2.0',
        info: {
          title: 'Fulcrum API',
          version: '1.0.0',
          description: 'Fulcrum docs',
        },
        tags: [
          { name: 'user', description: 'User related stuff' },
          { name: 'goals', description: 'goal related stuff' },
          { name: 'tasks', description: 'tasks related stuff' },
        ],
        host: `localhost:${this.env.app.PORT}`,
        basePath: '/',
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json'],
      },
      apis: ['./src/app/routes/v1/*.ts'],
    };

    return swaggerJSDocs(options);
  }
}
