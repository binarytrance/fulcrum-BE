import { OccurrenceStatus } from '@habits/domain/types/habit.types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class HabitOccurrence {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'Habit', required: true, index: true })
  habitId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  /** YYYY-MM-DD (UTC) */
  @Prop({ type: String, required: true, index: true })
  date: string;

  @Prop({
    type: String,
    enum: OccurrenceStatus,
    default: OccurrenceStatus.PENDING,
    index: true,
  })
  status: OccurrenceStatus;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  /** Session ID if the user ran a timer session for this occurrence */
  @Prop({ type: String, default: null })
  sessionId: string | null;

  @Prop({ type: Number, default: null, min: 0 })
  durationMinutes: number | null;

  @Prop({ type: String, default: null })
  note: string | null;

  createdAt: Date;
}

export type HabitOccurrenceDocument = HydratedDocument<HabitOccurrence>;
export const HabitOccurrenceSchema =
  SchemaFactory.createForClass(HabitOccurrence);

/** "What habits are due today for a user?" */
HabitOccurrenceSchema.index({ userId: 1, date: 1, status: 1 });
/** Uniqueness: one occurrence per habit per day */
HabitOccurrenceSchema.index({ habitId: 1, date: 1 }, { unique: true });
/** Analytics: occurrence history in date range */
HabitOccurrenceSchema.index({ habitId: 1, date: -1 });
