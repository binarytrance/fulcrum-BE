import expressSwaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import { injectable } from 'tsyringe';
import { AuthRouter, GoalsRouter } from '@routes';
import { Swagger } from '@shared/services/docs';

@injectable()
export class AppRouter {
  constructor(
    private readonly goalsRouter: GoalsRouter,
    private readonly authRouter: AuthRouter,
    private readonly swagger: Swagger
  ) {}

  public loadGoalsRoutes(app: Application) {
    app.use(
      '/api-docs',
      expressSwaggerUi.serve,
      expressSwaggerUi.setup(this.swagger.configure())
    );
    app.use('/api/v1/auth', this.authRouter.mount());
    app.use('/api/v1/goals', this.goalsRouter.mount());
  }
}
