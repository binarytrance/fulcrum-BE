import { User } from '@users/domain/entities/user.entity';

export const USER_REPO_PORT = Symbol('USER_PORT');

export interface IUserRepository {
  create(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(user: User): Promise<void>;
}
