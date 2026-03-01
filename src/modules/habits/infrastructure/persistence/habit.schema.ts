import { HabitFrequency, HabitStatus } from '@habits/domain/types/habit.types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Habit {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Goal', required: true, index: true })
  goalId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, enum: HabitFrequency, required: true })
  frequency: HabitFrequency;

  /** Day indices (0 = Sun … 6 = Sat). Empty = every day (DAILY). */
  @Prop({ type: [Number], default: [] })
  daysOfWeek: number[];

  @Prop({ type: Number, required: true, min: 1 })
  targetDuration: number;

  @Prop({
    type: String,
    enum: HabitStatus,
    default: HabitStatus.ACTIVE,
    index: true,
  })
  status: HabitStatus;

  @Prop({ type: Number, default: 0 })
  currentStreak: number;

  @Prop({ type: Number, default: 0 })
  longestStreak: number;

  @Prop({ type: Date, default: null, index: true })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type HabitDocument = HydratedDocument<Habit>;
export const HabitSchema = SchemaFactory.createForClass(Habit);

HabitSchema.index({ userId: 1, status: 1 });
HabitSchema.index({ userId: 1, goalId: 1 });
