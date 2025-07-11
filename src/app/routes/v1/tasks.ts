import express, { Router } from 'express';
import { TaskController } from '~/app/controllers/v1';
import { validationHandler } from '~/app/middleware';
import { tasksParamsSchema } from '~/app/schema/tasks';

export class TaskRoutes {
  public taskRouter: Router;
  private taskController: TaskController;

  constructor() {
    this.taskRouter = express.Router();
    this.taskController = new TaskController();
    this.initGetRoutes();
  }

  private initGetRoutes() {
    this.taskRouter.get(
      '/:goalId',
      validationHandler({ params: tasksParamsSchema }),
      this.taskController.getTasks,
    );
  }
}
