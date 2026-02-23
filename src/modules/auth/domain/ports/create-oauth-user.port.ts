import type { AuthUserView } from './find-user.port';

export const CREATE_OAUTH_USER_PORT = Symbol('CREATE_OAUTH_USER_PORT');

export interface ICreateOAuthUserPort {
  execute(
    email: string,
    firstname: string,
    lastname: string | null,
  ): Promise<AuthUserView>;
}
