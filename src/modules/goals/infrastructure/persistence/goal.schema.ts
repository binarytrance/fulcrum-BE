import {
  GoalCategory,
  GoalStatus,
  GoalPriority,
  INITIAL_PROGRESS,
} from '@goals/domain/types/goal.types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class GoalProgressSchema {
  @Prop({ type: Number, default: 0 }) totalTasks: number;
  @Prop({ type: Number, default: 0 }) completedTasks: number;
  @Prop({ type: Number, default: 0 }) completionPercent: number;
  @Prop({ type: Number, default: 0 }) totalLoggedMinutes: number;
  @Prop({ type: Number, default: 0 }) estimatedMinutes: number;
  @Prop({ type: Date, default: () => new Date(0) }) lastComputedAt: Date;
}

@Schema({ timestamps: true, versionKey: false })
export class Goal {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Goal', default: null, index: true })
  parentGoalId: Types.ObjectId | null;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, enum: GoalCategory, required: true })
  category: GoalCategory;

  @Prop({
    type: String,
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
    index: true,
  })
  status: GoalStatus;

  @Prop({ type: String, enum: GoalPriority, default: GoalPriority.MEDIUM })
  priority: GoalPriority;

  @Prop({ type: Date, default: null })
  deadline: Date | null;

  @Prop({ type: Number, default: null, min: 0 })
  estimatedHours: number | null;

  @Prop({ type: Number, required: true, min: 1, max: 3 })
  level: 1 | 2 | 3;

  @Prop({
    type: {
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      completionPercent: { type: Number, default: 0 },
      totalLoggedMinutes: { type: Number, default: 0 },
      estimatedMinutes: { type: Number, default: 0 },
      lastComputedAt: { type: Date, default: () => new Date(0) },
    },
    default: () => ({ ...INITIAL_PROGRESS, lastComputedAt: new Date(0) }),
    _id: false,
  })
  progress: {
    totalTasks: number;
    completedTasks: number;
    completionPercent: number;
    totalLoggedMinutes: number;
    estimatedMinutes: number;
    lastComputedAt: Date;
  };

  /** null = live document. Non-null = soft-deleted. */
  @Prop({ type: Date, default: null, index: true })
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type GoalDocument = HydratedDocument<Goal>;
export const GoalSchema = SchemaFactory.createForClass(Goal);

GoalSchema.index({ userId: 1, status: 1 });
GoalSchema.index({ userId: 1, category: 1 });
/** Partial index so only live documents are indexed for tree queries */
GoalSchema.index({ userId: 1, deletedAt: 1 });
