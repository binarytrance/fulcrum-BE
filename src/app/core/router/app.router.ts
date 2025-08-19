import { Application } from 'express';
import { injectable } from 'tsyringe';
import { AuthRouter, GoalsRouter } from '~/app/routes';

@injectable()
export class AppRouter {
  constructor(
    private readonly goalsRouter: GoalsRouter,
    private readonly authRouter: AuthRouter
  ) {}

  public loadGoalsRoutes(app: Application) {
    app.use('/api/v1/goals', this.goalsRouter.mount());
    app.use('/api/v1/auth', this.authRouter.mount());
  }
}
