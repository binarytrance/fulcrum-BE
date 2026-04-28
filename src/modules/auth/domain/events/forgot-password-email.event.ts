export class ForgotPasswordEmailEvent {
  readonly type = 'ForgotPasswordEmailEvent';

  constructor(
    public readonly email: string,
    public readonly resetToken: string | null,
    public readonly timestamp: Date = new Date(),
  ) {}
}
