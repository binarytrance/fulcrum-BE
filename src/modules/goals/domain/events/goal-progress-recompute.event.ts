export class GoalProgressRecomputeEvent {
  readonly type = 'GoalProgressRecomputeEvent';

  constructor(
    public readonly goalId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}
