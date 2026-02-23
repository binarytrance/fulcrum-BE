import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  type IUserRepository,
  USER_REPO_PORT,
} from '@users/domain/ports/user-rep.port';
import {
  type IIDGenerator,
  ID_GENERATOR_PORT,
} from '@shared/domain/ports/id-generator.port';
import { User } from '@users/domain/entities/user.entity';
import { UserStatus } from '@users/domain/types/user.types';

@Injectable()
export class CreateOAuthUserService {
  constructor(
    @Inject(USER_REPO_PORT) private readonly userRepo: IUserRepository,
    @Inject(ID_GENERATOR_PORT) private readonly idGenerator: IIDGenerator,
  ) {}

  async execute(
    email: string,
    firstname: string,
    lastname: string | null,
  ): Promise<{ id: string; email: string }> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new ConflictException('Email already exists');

    const id = this.idGenerator.generate();
    const now = new Date();

    const user = new User({
      id,
      email,
      firstname,
      lastname,
      status: UserStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepo.create(user);
    return { id: user.id, email: user.email };
  }
}
