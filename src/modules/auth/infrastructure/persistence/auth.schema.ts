import { AuthProviders } from '@/modules/auth/domain/types/auth.types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Auth {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: AuthProviders, required: true })
  provider: AuthProviders;

  @Prop({ type: String, default: null, index: true })
  providerId: string | null;

  @Prop({ type: String, default: null, select: false })
  hashedPassword: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export type AuthDocument = HydratedDocument<Auth>;
export const AuthSchema = SchemaFactory.createForClass(Auth);

AuthSchema.index({ provider: 1, providerId: 1 }, { unique: true });
AuthSchema.index({ userId: 1, provider: 1 }, { unique: true });
