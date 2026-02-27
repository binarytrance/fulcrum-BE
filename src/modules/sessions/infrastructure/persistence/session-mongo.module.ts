import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SessionDoc,
  SessionSchema,
} from '@sessions/infrastructure/persistence/session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SessionDoc.name, schema: SessionSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class SessionMongoModule {}
