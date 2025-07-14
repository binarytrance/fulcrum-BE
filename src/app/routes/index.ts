import { Application, NextFunction, Request, Response } from 'express';
import { GoalRoutes, UserRoutes, TaskRoutes } from './v1';
import expressSwaggerUi from 'swagger-ui-express';
import { NotFoundError, Swagger } from '~/services';

export class Routes {
  private app: Application;
  private swagger: Swagger;
  private goalRoutes: GoalRoutes;
  private userRoutes: UserRoutes;
  private taskRoutes: TaskRoutes;

  constructor(app: Application) {
    this.app = app;
    this.swagger = Swagger.getInstance();
    this.goalRoutes = new GoalRoutes();
    this.userRoutes = new UserRoutes();
    this.taskRoutes = new TaskRoutes();
  }

  public v1Routes() {
    this.app.use('/api/v1/users', this.userRoutes.userRouter);
    this.app.use('/api/v1/goals', this.goalRoutes.goalRouter);
    this.app.use('/api/v1/tasks', this.taskRoutes.taskRouter);
  }

  public healthRoute() {
    this.app.get('/health', (_req: Request, res: Response) => {
      res.send('healthy');
    });
  }

  public notFoundRoute() {
    this.app.use((_req: Request, _res: Response, _next: NextFunction) => {
      throw new NotFoundError();
    });
  }

  public swaggerDocRoute() {
    this.app.use(
      '/api-docs',
      expressSwaggerUi.serve,
      expressSwaggerUi.setup(this.swagger.getSpecs()),
    );
  }
}
