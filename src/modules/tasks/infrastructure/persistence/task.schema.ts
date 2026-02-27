import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@tasks/domain/types/task.types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Task {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Goal', default: null, index: true })
  goalId: Types.ObjectId | null;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({
    type: String,
    enum: TaskStatus,
    default: TaskStatus.PENDING,
    index: true,
  })
  status: TaskStatus;

  @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Prop({ type: String, enum: TaskType, required: true })
  type: TaskType;

  /** The calendar date the user plans to work on this task */
  @Prop({ type: Date, default: null, index: true })
  scheduledFor: Date | null;

  /** Time-box set at creation, in minutes */
  @Prop({ type: Number, required: true, min: 1 })
  estimatedDuration: number;

  /** Computed from sum of session durations on completion (Phase 4) */
  @Prop({ type: Number, default: null, min: 0 })
  actualDuration: number | null;

  /**
   * (estimatedDuration / actualDuration) * 100
   * Used by the AI estimator in later phases.
   */
  @Prop({ type: Number, default: null })
  efficiencyScore: number | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: Date, default: null, index: true })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type TaskDocument = HydratedDocument<Task>;
export const TaskSchema = SchemaFactory.createForClass(Task);

/** Primary index for the daily planner view: GET /tasks?date=... */
TaskSchema.index({ userId: 1, scheduledFor: 1, deletedAt: 1 });
/** Secondary indexes */
TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, type: 1 });
