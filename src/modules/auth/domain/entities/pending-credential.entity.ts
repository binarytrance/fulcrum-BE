export interface PendingCredentialFields {
  id: string;
  email: string;
  firstname: string;
  lastname: string | null;
  hashedPassword: string;
  emailVerificationToken: string;
  createdAt: Date;
}

export class PendingCredential {
  private readonly _id: string;
  private readonly _email: string;
  private readonly _firstname: string;
  private readonly _lastname: string | null;
  private readonly _hashedPassword: string;
  private readonly _emailVerificationToken: string;
  private readonly _createdAt: Date;

  constructor({
    id,
    email,
    firstname,
    lastname,
    hashedPassword,
    emailVerificationToken,
    createdAt,
  }: PendingCredentialFields) {
    this._id = id;
    this._email = email;
    this._firstname = firstname;
    this._lastname = lastname;
    this._hashedPassword = hashedPassword;
    this._emailVerificationToken = emailVerificationToken;
    this._createdAt = createdAt;
  }

  get id() {
    return this._id;
  }

  get email() {
    return this._email;
  }

  get firstname() {
    return this._firstname;
  }

  get lastname(): string | null {
    return this._lastname;
  }

  get hashedPassword() {
    return this._hashedPassword;
  }

  get emailVerificationToken() {
    return this._emailVerificationToken;
  }

  get createdAt() {
    return this._createdAt;
  }
}
