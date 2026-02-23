import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PendingCredential as PendingCredentialEntity } from '@auth/domain/entities/pending-credential.entity';
import { IPendingCredentialRepository } from '@auth/domain/ports/pending-credential-repo.port';
import {
  PendingCredential,
  PendingCredentialDocument,
} from '@auth/infrastructure/persistence/pending-credential.schema';

@Injectable()
export class PendingCredentialRepository
  implements IPendingCredentialRepository
{
  constructor(
    @InjectModel(PendingCredential.name)
    private readonly model: Model<PendingCredentialDocument>,
  ) {}

  async save(credential: PendingCredentialEntity): Promise<void> {
    await this.model.create({
      email: credential.email,
      firstname: credential.firstname,
      lastname: credential.lastname,
      hashedPassword: credential.hashedPassword,
      emailVerificationToken: credential.emailVerificationToken,
      createdAt: credential.createdAt,
    });
  }

  async findByEmail(email: string): Promise<PendingCredentialEntity | null> {
    const doc = await this.model.findOne({ email }).lean();
    if (!doc) return null;
    return new PendingCredentialEntity({
      id: doc._id.toString(),
      email: doc.email,
      firstname: doc.firstname,
      lastname: doc.lastname,
      hashedPassword: doc.hashedPassword,
      emailVerificationToken: doc.emailVerificationToken,
      createdAt: doc.createdAt,
    });
  }

  async deleteById(id: string): Promise<void> {
    await this.model.deleteOne({ _id: id });
  }
}
