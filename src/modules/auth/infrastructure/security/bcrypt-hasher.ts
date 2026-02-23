import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { IPasswordHasher } from '@auth/domain/ports/password-hasher.port';

@Injectable()
export class BcryptHasher implements IPasswordHasher {
  async hashPassword(data: string | Buffer): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(data, salt);
  }

  async comparePassword(
    data: string | Buffer,
    encrypted: string,
  ): Promise<boolean> {
    return await bcrypt.compare(data, encrypted);
  }
}
