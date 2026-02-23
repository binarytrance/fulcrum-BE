export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
  PENDING = 'PENDING',
}

export interface UserFields {
  id: string;
  firstname: string;
  lastname: string | null;
  email: string;
  status: UserStatus;
  isEmailVerified: boolean;
  emailVerificationToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}
