export class SignupEmailEvent {
  readonly type = 'SignupEmailEvent';

  constructor(
    public readonly email: string,
    public readonly verificationToken: string | null,
    public readonly timestamp: Date = new Date(),
  ) {}
}
