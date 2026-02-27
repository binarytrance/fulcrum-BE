import {
  PlantStatus,
  SessionSource,
  SessionStatus,
} from '@sessions/domain/types/session.types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class DistractionSchema {
  @Prop({ type: String, required: true }) reason: string;
  @Prop({ type: Number, required: true, min: 0 }) estimatedMinutes: number;
  @Prop({ type: Date, required: true }) loggedAt: Date;
}

@Schema({ timestamps: false, versionKey: false })
export class SessionDoc {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, index: true })
  taskId: string;

  @Prop({
    type: String,
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
    index: true,
  })
  status: SessionStatus;

  @Prop({ type: String, enum: SessionSource, required: true })
  source: SessionSource;

  @Prop({ type: Date, required: true })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  @Prop({ type: Number, default: null, min: 0 })
  durationMinutes: number | null;

  @Prop({ type: Number, default: null, min: 0 })
  netFocusMinutes: number | null;

  @Prop({
    type: [
      {
        reason: { type: String, required: true },
        estimatedMinutes: { type: Number, required: true, min: 0 },
        loggedAt: { type: Date, required: true },
        _id: false,
      },
    ],
    default: [],
  })
  distractions: DistractionSchema[];

  @Prop({ type: String, enum: PlantStatus, default: PlantStatus.HEALTHY })
  plantStatus: PlantStatus;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  plantGrowthPercent: number;

  @Prop({ type: Date, required: true })
  createdAt: Date;
}

export type SessionDocument = HydratedDocument<SessionDoc>;
export const SessionSchema = SchemaFactory.createForClass(SessionDoc);

SessionSchema.index({ userId: 1, status: 1 });
SessionSchema.index({ userId: 1, startedAt: -1 });
