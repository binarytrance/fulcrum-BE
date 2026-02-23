export const MARK_EMAIL_VERIFIED_PORT = Symbol('MARK_EMAIL_VERIFIED_PORT');

export interface IMarkEmailVerifiedPort {
  execute(userId: string): Promise<void>;
}
