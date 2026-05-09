import { UserStatus } from '@/modules/users/domain/types/user.types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
class AppStreakSchema {
  @Prop({ type: Number, default: 0 }) current!: number;
  @Prop({ type: Number, default: 0 }) longest!: number;
  @Prop({ type: String, default: null }) lastActiveDate!: string | null;
}

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ type: String, required: true })
  firstname!: string;

  @Prop({ type: String, default: null })
  lastname!: string | null;

  @Prop({ type: String, unique: true, index: true, required: true })
  email!: string;

  @Prop({ type: String, enum: UserStatus, default: 'ACTIVE', index: true })
  status!: string;

  @Prop({ type: AppStreakSchema, default: () => ({ current: 0, longest: 0, lastActiveDate: null }) })
  appStreak!: AppStreakSchema;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
