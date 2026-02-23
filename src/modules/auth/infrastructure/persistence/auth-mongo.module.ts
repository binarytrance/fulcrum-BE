import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Auth, AuthSchema } from '@auth/infrastructure/persistence/auth.schema';
import {
  PendingCredential,
  PendingCredentialSchema,
} from '@auth/infrastructure/persistence/pending-credential.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Auth.name, schema: AuthSchema },
      { name: PendingCredential.name, schema: PendingCredentialSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class AuthMongoModule {}
