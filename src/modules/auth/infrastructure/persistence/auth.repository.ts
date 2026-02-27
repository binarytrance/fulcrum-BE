import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Auth as MongooseAuth,
  AuthDocument,
} from '@/modules/auth/infrastructure/persistence/auth.schema';
import { Model } from 'mongoose';
import { Auth } from '@/modules/auth/domain/entities/auth.entity';
import { AuthProviders } from '@/modules/auth/domain/types/auth.types';
import { IAuthRepository } from '@auth/domain/ports/auth-repo.port';
import { mongoSessionContext } from '@shared/infrastructure/persistence/mongo-session.context';

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(
    @InjectModel(MongooseAuth.name)
    private readonly authModel: Model<AuthDocument>,
  ) {}

  async create(credential: Auth): Promise<void> {
    const session = mongoSessionContext.getStore();
    await this.authModel.create([this.toPersistence(credential)], { session });
  }

  async findByUserId(userId: string): Promise<Auth | null> {
    const doc = await this.authModel
      .findOne({ userId })
      .select('+hashedPassword')
      .lean();
    if (!doc) return null;
    return new Auth({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      hashedPassword: doc.hashedPassword,
      provider: doc.provider,
      providerId: doc.providerId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findByProvider(
    provider: AuthProviders,
    providerId: string,
  ): Promise<Auth | null> {
    const doc = await this.authModel
      .findOne({ provider, providerId })
      .select('+hashedPassword')
      .lean();
    if (!doc) return null;
    return new Auth({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      hashedPassword: doc.hashedPassword,
      provider: doc.provider,
      providerId: doc.providerId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async update(credential: Auth): Promise<void> {
    const session = mongoSessionContext.getStore();
    await this.authModel.updateOne(
      { _id: credential.id },
      { $set: this.toPersistence(credential) },
      { session },
    );
  }

  public toPersistence(auth: Auth) {
    return {
      _id: auth.id,
      userId: auth.userId,
      providerId: auth.providerId,
      provider: auth.provider,
      hashedPassword: auth.hashedPassword,
    };
  }
}
