import express, { Application } from 'express';
import { GoalRoutes, UserRoutes, TaskRoutes } from './v1';

export class Routes {
  private app: Application;
  private router = express.Router();
  private goalRoutes: GoalRoutes;
  private userRoutes: UserRoutes;
  private taskRoutes: TaskRoutes;

  constructor(app: Application) {
    this.app = app;
    this.goalRoutes = new GoalRoutes();
    this.userRoutes = new UserRoutes();
    this.taskRoutes = new TaskRoutes();
  }

  public v1Routes() {
    this.app.use('/api/v1/users', this.userRoutes.userRouter);
    this.app.use('/api/v1/goals', this.goalRoutes.goalRouter);
    this.app.use('/api/v1/tasks', this.taskRoutes.taskRouter);
  }
}
