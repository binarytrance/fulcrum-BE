import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  type IUserRepository,
  USER_REPO_PORT,
} from '@users/domain/ports/user-rep.port';
import { User } from '@/modules/users/domain/entities/user.entity';
import { UserStatus } from '@/modules/users/domain/types/user.types';

@Injectable()
export class CreateUserService {
  constructor(
    @Inject(USER_REPO_PORT) private readonly userRepo: IUserRepository,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
  ) {}

  async execute(email: string, firstname: string, lastname: string | null) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const id = this.idGenerator.generate();
    const now = new Date();

    const user = new User({
      id,
      email,
      firstname,
      lastname,
      status: UserStatus.ACTIVE,
      appStreak: { current: 0, longest: 0, lastActiveDate: null },
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepo.create(user);
    return user;
  }
}
