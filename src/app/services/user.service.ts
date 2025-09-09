import { injectable } from 'tsyringe';
import { UserRepository } from '@repositories';
import { IUser } from '@interfaces';

@injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  public async getProfile(userid: IUser['id']) {
    return await this.userRepository.findById(userid);
  }

  public async getAvailableEmail(email: IUser['email']) {
    return await this.userRepository.findByEmail(email);
  }

  public async createUser(email: IUser['email'], name: IUser['name']) {
    return await this.userRepository.create(email, name);
  }
}
