import { randomUUID } from 'crypto';
import { IIDGenerator } from '@shared/domain/ports/id-generator.port';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UUIDGenerator implements IIDGenerator {
  generate(): string {
    return randomUUID();
  }
}
