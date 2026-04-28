import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: false, versionKey: false })
export class PasswordResetToken {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  email: string;

  @Prop({ type: String, required: true })
  resetToken: string;

  @Prop({ type: Date, required: true, index: { expires: 0 } })
  tokenExpiresAt: Date;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export type PasswordResetTokenDocument = HydratedDocument<PasswordResetToken>;
export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);
