import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Auth, AuthSchema } from '@auth/infrastructure/persistence/auth.schema';
import {
  PendingCredential,
  PendingCredentialSchema,
} from '@auth/infrastructure/persistence/pending-credential.schema';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from '@auth/infrastructure/persistence/password-reset-token.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Auth.name, schema: AuthSchema },
      { name: PendingCredential.name, schema: PendingCredentialSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class AuthMongoModule {}
