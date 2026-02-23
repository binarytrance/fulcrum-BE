export enum AuthProviders {
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
  LOCAL = 'LOCAL',
}

export interface AuthFields {
  id: string;
  userId: string;
  provider: AuthProviders;
  providerId: string | null;
  hashedPassword: string | null;
  createdAt: Date;
  updatedAt: Date;
}
