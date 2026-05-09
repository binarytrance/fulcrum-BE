import {
  AppStreak,
  DEFAULT_APP_STREAK,
  UserFields,
  UserStatus,
} from '@/modules/users/domain/types/user.types';

export class User {
  private readonly _id: string;
  private readonly _firstname: string;
  private readonly _lastname: string | null;
  private readonly _email: string;
  private readonly _status: UserStatus;
  private readonly _appStreak: AppStreak;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  constructor({
    createdAt,
    email,
    firstname,
    id,
    lastname,
    status,
    appStreak,
    updatedAt,
  }: UserFields) {
    this._id = id;
    this._createdAt = createdAt;
    this._email = email;
    this._firstname = firstname;
    this._lastname = lastname;
    this._status = status;
    this._appStreak = appStreak ?? DEFAULT_APP_STREAK;
    this._updatedAt = updatedAt;
  }

  get id() { return this._id; }
  get email() { return this._email; }
  get firstname() { return this._firstname; }
  get lastname() { return this._lastname; }
  get status() { return this._status; }
  get appStreak() { return this._appStreak; }
  get createdAt() { return this._createdAt; }
  get updatedAt() { return this._updatedAt; }

  withStreak(current: number, longest: number, lastActiveDate: string): User {
    return new User({
      id: this._id,
      email: this._email,
      firstname: this._firstname,
      lastname: this._lastname,
      status: this._status,
      appStreak: { current, longest, lastActiveDate },
      createdAt: this._createdAt,
      updatedAt: new Date(),
    });
  }
}
