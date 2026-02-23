import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  type IAuthRepository,
  AUTH_REPO_PORT,
} from '@auth/domain/ports/auth-repo.port';
import {
  type IPasswordHasher,
  PASSWORD_HASH_PORT,
} from '@auth/domain/ports/password-hasher.port';
import { type ITokenService, TOKEN_PORT } from '@auth/domain/ports/token.port';
import type { AuthTokens } from '@auth/domain/types/token.types';
import {
  type IFindUserPort,
  FIND_USER_PORT,
} from '@auth/domain/ports/find-user.port';

@Injectable()
export class LocalSigninService {
  constructor(
    @Inject(FIND_USER_PORT) private readonly findUser: IFindUserPort,
    @Inject(AUTH_REPO_PORT) private readonly authRepo: IAuthRepository,
    @Inject(PASSWORD_HASH_PORT)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_PORT) private readonly tokenService: ITokenService,
  ) {}

  async execute(email: string, password: string): Promise<AuthTokens> {
    const user = await this.findUser.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const auth = await this.authRepo.findByUserId(user.id);
    if (!auth || !auth.hashedPassword)
      throw new UnauthorizedException('Invalid credentials');

    const isValid = await this.passwordHasher.comparePassword(
      password,
      auth.hashedPassword,
    );
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    return this.tokenService.generateTokens(user.id, user.email);
  }
}
