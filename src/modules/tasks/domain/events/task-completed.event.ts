export class TaskCompletedEvent {
  readonly type = 'TaskCompletedEvent';

  constructor(
    public readonly taskId: string,
    public readonly userId: string,
    /** null if the task is not linked to any goal */
    public readonly goalId: string | null,
    public readonly timestamp: Date = new Date(),
  ) {}
}
