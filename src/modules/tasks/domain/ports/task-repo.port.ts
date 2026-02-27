import type { Task } from '@tasks/domain/entities/task.entity';
import type { TaskStatus, TaskType } from '@tasks/domain/types/task.types';

export interface TaskFilter {
  status?: TaskStatus;
  type?: TaskType;
  goalId?: string;
}

export const TASK_REPO_PORT = Symbol('TASK_REPO_PORT');

export interface ITaskRepository {
  create(task: Task): Promise<void>;
  findById(id: string): Promise<Task | null>;
  /**
   * All non-deleted tasks for a user on a given calendar date.
   * Uses scheduledFor range: [start-of-day, end-of-day] UTC.
   */
  findByDate(userId: string, date: Date): Promise<Task[]>;
  findByUserId(userId: string, filter?: TaskFilter): Promise<Task[]>;
  update(task: Task): Promise<void>;
  softDelete(id: string): Promise<void>;
}
