export const SESSIONS_QUEUE_NAME = 'sessions';

export enum SessionJobName {
  ABANDON_STALE = 'sessions.abandon-stale',
  UPDATE_TASK_DURATION = 'sessions.update-task-duration',
}

export interface AbandonStaleJobPayload {
  sessionId: string;
  userId: string;
}

export interface UpdateTaskDurationPayload {
  taskId: string;
  durationMinutes: number;
}
