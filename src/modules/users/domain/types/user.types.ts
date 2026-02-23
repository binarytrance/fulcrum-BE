export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export interface UserFields {
  id: string;
  firstname: string;
  lastname: string | null;
  email: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
