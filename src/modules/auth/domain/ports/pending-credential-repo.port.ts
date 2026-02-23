import { PendingCredential } from '@auth/domain/entities/pending-credential.entity';

export const PENDING_CREDENTIAL_REPO_PORT = Symbol(
  'PENDING_CREDENTIAL_REPO_PORT',
);

export interface IPendingCredentialRepository {
  save(credential: PendingCredential): Promise<void>;
  findByEmail(email: string): Promise<PendingCredential | null>;
  deleteById(id: string): Promise<void>;
}
