export class GoalEstimatedEndDateChangedEvent {
  readonly type = 'GoalEstimatedEndDateChangedEvent';

  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly newEstimatedEndDate: Date | null,
    public readonly timestamp: Date = new Date(),
  ) {}
}
