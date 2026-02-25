import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Goal,
  GoalSchema,
} from '@goals/infrastructure/persistence/goal.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Goal.name, schema: GoalSchema }]),
  ],
  exports: [MongooseModule],
})
export class GoalMongoModule {}
