import { User } from '@/modules/users/domain/entities/user.entity';

export const CREATE_USER_PORT = Symbol('CREATE_USER_PORT');

export interface ICreateUserPort {
  execute(email: string, firstname: string, lastname: string): Promise<User>;
}
