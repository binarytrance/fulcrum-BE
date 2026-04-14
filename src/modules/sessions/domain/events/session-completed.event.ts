export class SessionCompletedEvent {
  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly taskId: string,
    public readonly durationMs: number,
  ) {}
}
