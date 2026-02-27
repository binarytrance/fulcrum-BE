import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Task,
  TaskSchema,
} from '@tasks/infrastructure/persistence/task.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
  ],
  exports: [MongooseModule],
})
export class TaskMongoModule {}
