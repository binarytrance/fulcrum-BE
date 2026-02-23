export const CREATE_USER_PORT = Symbol('CREATE_USER_PORT');

export interface AuthNewUserView {
  id: string;
}

export interface ICreateUserPort {
  execute(
    email: string,
    firstname: string,
    lastname: string | null,
  ): Promise<AuthNewUserView>;
}
