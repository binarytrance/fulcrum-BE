import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: false, versionKey: false })
export class PendingCredential {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  email: string;

  @Prop({ type: String, required: true })
  firstname: string;

  @Prop({ type: String, default: null })
  lastname: string | null;

  @Prop({ type: String, required: true })
  hashedPassword: string;

  @Prop({ type: String, required: true })
  emailVerificationToken: string;

  @Prop({ type: Date, required: true })
  tokenExpiresAt: Date;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export type PendingCredentialDocument = HydratedDocument<PendingCredential>;
export const PendingCredentialSchema =
  SchemaFactory.createForClass(PendingCredential);
