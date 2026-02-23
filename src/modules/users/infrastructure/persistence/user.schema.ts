import { UserStatus } from '@/modules/users/domain/types/user.types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class User {
  @Prop({ type: String, required: true })
  _id: string;

  @Prop({ type: String, required: true })
  firstname: string;

  @Prop({ type: String, default: null })
  lastname: string | null;

  @Prop({ type: Boolean, default: false })
  isEmailVerified: boolean;

  @Prop({ type: String, default: null })
  emailVerificationToken: string | null;

  @Prop({ type: String, unique: true, index: true, required: true })
  email: string;

  @Prop({ type: String, enum: UserStatus, default: 'ACTIVE', index: true })
  status: string;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { emailVerificationToken: 1 },
  { partialFilterExpression: { emailVerificationToken: { $type: 'string' } } },
);
