import {
  GoalCategory,
  GoalStatus,
  GoalPriority,
  INITIAL_PROGRESS,
} from '@goals/domain/types/goal.types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class GoalProgressSchema {
  @Prop({ type: Number, default: 0 }) totalTasks: number;
  @Prop({ type: Number, default: 0 }) completedTasks: number;
  @Prop({ type: Number, default: 0 }) totalLoggedMs: number;
  @Prop({ type: Number, default: 0 }) score: number;
  @Prop({ type: Date, default: () => new Date(0) }) lastComputedAt: Date;
}

@Schema({ timestamps: true, versionKey: false })
export class Goal {
  @Prop({ type: String })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, default: null, index: true })
  parentGoalId: string | null;

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
  estimatedEndDate: Date | null;

  @Prop({ type: Date, default: null })
  estimatedStartDate: Date | null;

  @Prop({ type: Number, default: null, min: 0 })
  estimatedDuration: number | null;

  @Prop({ type: Date, default: null })
  actualStartDate: Date | null;

  @Prop({ type: Date, default: null })
  actualEndDate: Date | null;

  @Prop({ type: Number, required: true, min: 1, max: 3 })
  level: 1 | 2 | 3;

  @Prop({
    type: {
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      totalLoggedMs: { type: Number, default: 0 },
      score: { type: Number, default: 0 },
      lastComputedAt: { type: Date, default: () => new Date(0) },
    },
    default: () => ({ ...INITIAL_PROGRESS, lastComputedAt: new Date(0) }),
    _id: false,
  })
  progress: {
    totalTasks: number;
    completedTasks: number;
    totalLoggedMs: number;
    score: number;
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
