import { AuthFields } from '@/modules/auth/domain/types/auth.types';

export class Auth {
  private readonly _id: AuthFields['id'];
  private readonly _userId: AuthFields['userId'];
  private readonly _providerId: AuthFields['providerId'];
  private readonly _provider: AuthFields['provider'];
  private readonly _hashedPassword: AuthFields['hashedPassword'];
  private readonly _createdAt: AuthFields['createdAt'];
  private readonly _updatedAt: AuthFields['updatedAt'];

  constructor({
    id,
    userId,
    hashedPassword,
    provider,
    providerId,
    createdAt,
    updatedAt,
  }: AuthFields) {
    this._id = id;
    this._userId = userId;
    this._hashedPassword = hashedPassword;
    this._provider = provider;
    this._providerId = providerId;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id() {
    return this._id;
  }

  get userId() {
    return this._userId;
  }

  get providerId() {
    return this._providerId;
  }

  get provider() {
    return this._provider;
  }

  get hashedPassword() {
    return this._hashedPassword;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }
}
