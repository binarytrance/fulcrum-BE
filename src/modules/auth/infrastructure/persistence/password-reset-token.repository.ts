import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PasswordResetToken as PasswordResetTokenEntity } from '@auth/domain/entities/password-reset-token.entity';
import { IPasswordResetTokenRepository } from '@auth/domain/ports/password-reset-token-repo.port';
import {
  PasswordResetToken as PasswordResetTokenSchema,
  PasswordResetTokenDocument,
} from '@auth/infrastructure/persistence/password-reset-token.schema';
import { mongoSessionContext } from '@shared/infrastructure/persistence/mongo-session.context';

@Injectable()
export class PasswordResetTokenRepository implements IPasswordResetTokenRepository {
  constructor(
    @InjectModel(PasswordResetTokenSchema.name)
    private readonly model: Model<PasswordResetTokenDocument>,
  ) {}

  async save(token: PasswordResetTokenEntity): Promise<void> {
    const session = mongoSessionContext.getStore();
    await this.model.updateOne(
      { email: token.email },
      {
        $set: {
          resetToken: token.resetToken,
          tokenExpiresAt: token.tokenExpiresAt,
          createdAt: token.createdAt,
        },
        $setOnInsert: {
          _id: token.id,
          email: token.email,
        },
      },
      { session, upsert: true },
    );
  }

  async findByEmail(email: string): Promise<PasswordResetTokenEntity | null> {
    const doc = await this.model.findOne({ email }).lean();
    if (!doc) return null;

    return new PasswordResetTokenEntity({
      id: String(doc._id),
      email: doc.email,
      resetToken: doc.resetToken,
      tokenExpiresAt: doc.tokenExpiresAt,
      createdAt: doc.createdAt,
    });
  }

  async deleteByEmail(email: string): Promise<void> {
    const session = mongoSessionContext.getStore();
    await this.model.deleteOne({ email }, { session });
  }
}
