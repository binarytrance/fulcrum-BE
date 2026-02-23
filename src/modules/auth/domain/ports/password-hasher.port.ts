export const PASSWORD_HASH_PORT = Symbol('PASSWORD_HASH_PORT');

export interface IPasswordHasher {
  hashPassword(data: string | Buffer): Promise<string>;
  comparePassword(data: string | Buffer, encrypted: string): Promise<boolean>;
}
