import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { UserStatus } from '@users/domain/types/user.types';
import { User } from '@users/domain/entities/user.entity';
import { IUserRepository } from '@users/domain/ports/user-rep.port';
import {
  User as MongooseUser,
  UserDocument,
} from '@users/infrastructure/persistence/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectModel(MongooseUser.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: User): Promise<void> {
    await this.userModel.create(this.toPersistence(user));
  }

  async findById(id: string): Promise<User | null> {
    const doc = await this.userModel.findById(id).lean();

    if (!doc) return null;

    return new User({
      id: doc._id,
      firstname: doc.firstname,
      lastname: doc.lastname,
      email: doc.email,
      isEmailVerified: doc.isEmailVerified,
      emailVerificationToken: doc.emailVerificationToken,
      status: doc.status as UserStatus,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.userModel.findOne({ email }).lean();

    if (!doc) return null;

    return new User({
      id: doc._id,
      firstname: doc.firstname,
      lastname: doc.lastname,
      email: doc.email,
      isEmailVerified: doc.isEmailVerified,
      emailVerificationToken: doc.emailVerificationToken,
      status: doc.status as UserStatus,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async update(user: User): Promise<void> {
    await this.userModel.updateOne(
      { _id: user.id },
      { $set: this.toPersistence(user) },
    );
  }

  private toPersistence(user: User) {
    const {
      id,
      email,
      isEmailVerified,
      firstname,
      lastname,
      status,
      emailVerificationToken,
    } = user;

    return {
      _id: id,
      email,
      isEmailVerified,
      emailVerificationToken,
      firstname,
      lastname,
      status,
    };
  }
}
