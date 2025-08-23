import argon2 from 'argon2';
import { injectable } from 'tsyringe';
import { AuthRepository, UserRepository } from '@repositories';
import { IAuthAccount, IPassword, IUser } from '@interfaces';
import { InternalServerError, NotFoundError } from '@shared/errors';

@injectable()
export class AuthService {
  private argonOptions: argon2.Options = {
    type: argon2.argon2id,
    timeCost: 3,
    memoryCost: 1 << 16,
    parallelism: 1,
  };

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly userRepository: UserRepository
  ) {}

  public async findAuthAccountByProviderId(
    authProvider: IAuthAccount['authProvider'],
    providerUserId: IAuthAccount['providerUserId']
  ) {
    return await this.authRepository.findLinkByProvider(
      authProvider,
      providerUserId
    );
  }

  public checkEmailValidity(email: string | null) {
    if (!email) {
      throw new NotFoundError('Email not found');
    }

    return true;
  }

  public async loginOrSignupWithProvider(
    email: IUser['email'],
    name: IUser['name'],
    authProvider: IAuthAccount['authProvider'],
    providerUserId: IAuthAccount['providerUserId']
  ): Promise<Express.User> {
    // check if the user exists with the provoder email
    const existingUserByEmail = await this.userRepository.findByEmail(email);

    // if user exists
    if (existingUserByEmail) {
      // check if user row is linked to authAccounts row
      const linkedUserCred = await this.authRepository.findLinkByProvider(
        authProvider,
        providerUserId
      );

      // if user row is not linked to authAccounts row
      if (!linkedUserCred) {
        await this.authRepository.createAuthProvider(
          existingUserByEmail.id,
          authProvider,
          providerUserId,
          email
        );
      } else {
        await this.authRepository.updateLastLinkedAt(
          linkedUserCred.id,
          new Date()
        );

        return { id: linkedUserCred.id, name: existingUserByEmail.name };
      }
    } else {
      const newUser = await this.userRepository.create(email, name);
      const authAccount = await this.authRepository.createAuthProvider(
        newUser.id,
        authProvider,
        providerUserId,
        newUser.email
      );

      return { id: authAccount.userId, name: newUser.name };
    }

    return { id: existingUserByEmail.id, name: existingUserByEmail.name };
  }

  public async hashPassword(plain: string) {
    return argon2.hash(plain, this.argonOptions);
  }

  public async verifyPassword(plain: string, hash: string) {
    return argon2.verify(hash, plain, this.argonOptions);
  }

  public async createLocalCredential(userId: string, password: string) {
    const existing = await this.authRepository.findPasswordByUserId(userId);

    if (existing) {
      throw new InternalServerError('Password already set for this user');
    }

    const hash = await this.hashPassword(password);
    await this.authRepository.createPassword(userId, hash, 'argon2id', false);
  }

  public async loginWithCredential(email: string, password: string) {
    const creds = await this.authRepository.findPasswordHashByEmail(email);
    if (!creds || !creds.passwordHash) {
      return null;
    }

    const ok = this.verifyPassword(password, creds.passwordHash);
    if (!ok) {
      return null;
    }

    const passwordRow = await this.authRepository.findPasswordByUserId(
      creds.userId
    );

    if (passwordRow.needsRehash) {
      const newHash = await this.hashPassword(password);
      await this.authRepository.updateHash(creds.userId, newHash);
    }

    return { name: creds.name, email: creds.email, id: creds.userId };
  }
}
