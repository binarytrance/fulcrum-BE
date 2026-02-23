import { v4 as uuidV4 } from 'uuid';
import { IIDGenerator } from '@shared/domain/ports/id-generator.port';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UUIDGenerator implements IIDGenerator {
  generate(): string {
    return uuidV4();
  }
}
