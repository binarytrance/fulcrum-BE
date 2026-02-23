export const FIND_USER_PORT = Symbol('FIND_USER_PORT');

export interface AuthUserView {
  id: string;
  email: string;
}

export interface IFindUserPort {
  findByEmail(email: string): Promise<AuthUserView | null>;
  findById(id: string): Promise<AuthUserView | null>;
}
