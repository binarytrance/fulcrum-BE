import { Injectable } from '@nestjs/common';

// Users are created as active and verified at the point of email verification.
// This service is kept for interface compatibility but is no longer used.
@Injectable()
export class MarkEmailVerifiedService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_userId: string): Promise<void> {
    // no-op
  }
}
