export const FIND_USER_FOR_VERIFICATION_PORT = Symbol(
  'FIND_USER_FOR_VERIFICATION_PORT',
);

export interface UserVerificationView {
  id: string;
  email: string;
  emailVerificationToken: string | null;
  isEmailVerified: boolean;
}

export interface IFindUserForVerificationPort {
  findByEmail(email: string): Promise<UserVerificationView | null>;
}
