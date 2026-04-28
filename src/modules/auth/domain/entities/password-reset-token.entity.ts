export interface PasswordResetTokenFields {
  id: string;
  email: string;
  resetToken: string;
  tokenExpiresAt: Date;
  createdAt: Date;
}

export class PasswordResetToken {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _resetToken: string;
  private readonly _tokenExpiresAt: Date;
  private readonly _createdAt: Date;

  constructor(fields: PasswordResetTokenFields) {
    this._id = fields.id;
    this._email = fields.email;
    this._resetToken = fields.resetToken;
    this._tokenExpiresAt = fields.tokenExpiresAt;
    this._createdAt = fields.createdAt;
  }

  get id(): string {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get resetToken(): string {
    return this._resetToken;
  }

  get tokenExpiresAt(): Date {
    return this._tokenExpiresAt;
  }

  isExpired(): boolean {
    return new Date() > this._tokenExpiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
