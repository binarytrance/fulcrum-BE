import { injectable } from 'tsyringe';
import { AuthRepository } from '~/app/repositories';
import { IAuthAccount } from '../interfaces/auth.interface';

@injectable()
export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  public async getLinkedUser(
    authProvider: IAuthAccount['authProvider'],
    providerUserId: IAuthAccount['providerUserId']
  ) {
    return await this.authRepository.getUserByProvider(
      authProvider,
      providerUserId
    );
  }

  public async updateLoggedInUser(
    userId: IAuthAccount['userId'],
    authProvider: IAuthAccount['authProvider'],
    providerUserId: IAuthAccount['providerUserId'],
    emailAtLink: IAuthAccount['emailAtLink']
  ) {
    await this.authRepository.insertAuthAccount(
      userId,
      authProvider,
      providerUserId,
      emailAtLink
    );
  }
}
