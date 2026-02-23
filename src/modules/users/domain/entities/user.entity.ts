import {
  UserFields,
  UserStatus,
} from '@/modules/users/domain/types/user.types';

export class User {
  private readonly _id: string;
  private readonly _firstname: string;
  private readonly _lastname: string | null;
  private readonly _email: string;
  private readonly _status: UserStatus;
  private readonly _createdAt: Date;
  private readonly _updatedAt: Date;

  constructor({
    createdAt,
    email,
    firstname,
    id,
    lastname,
    status,
    updatedAt,
  }: UserFields) {
    this._id = id;
    this._createdAt = createdAt;
    this._email = email;
    this._firstname = firstname;
    this._lastname = lastname;
    this._status = status;
    this._updatedAt = updatedAt;
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

  get lastname() {
    return this._lastname;
  }

  get status() {
    return this._status;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }
}
