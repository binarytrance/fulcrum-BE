export class GoalDeadlineChangedEvent {
  readonly type = 'GoalDeadlineChangedEvent';

  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly newDeadline: Date | null,
    public readonly timestamp: Date = new Date(),
  ) {}
}
