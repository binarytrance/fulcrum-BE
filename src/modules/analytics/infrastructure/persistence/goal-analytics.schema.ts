import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ collection: 'goal_analytics', timestamps: false })
export class GoalAnalyticsDoc {
  static readonly name = 'GoalAnalytics';

  @Prop({ type: String, required: true }) _id!: string;
  @Prop({ type: String, required: true, unique: true, index: true }) goalId!: string;
  @Prop({ type: String, required: true, index: true }) userId!: string;
  @Prop({ type: String, required: true }) goalTitle!: string;

  @Prop({ type: Number, default: 0 }) totalLoggedMinutes!: number;
  @Prop({ type: Number, default: 0 }) taskCount!: number;
  @Prop({ type: Number, default: 0 }) completedTaskCount!: number;
  @Prop({ type: Number, default: 0 }) completionPercent!: number;
  @Prop({ type: Number, default: null }) avgEfficiencyScore!: number | null;
  @Prop({ type: Number, default: 0 }) consistencyScore!: number;
  @Prop({ type: Number, default: 0 }) weeklyAvgMinutes!: number;
  @Prop({ type: Date, default: null }) projectedCompletionDate!: Date | null;
  @Prop({ type: Boolean, default: null }) isOnTrack!: boolean | null;

  @Prop({ type: Date, required: true }) lastComputedAt!: Date;
}

export type GoalAnalyticsDocument = HydratedDocument<GoalAnalyticsDoc>;
export const GoalAnalyticsSchema = SchemaFactory.createForClass(GoalAnalyticsDoc);
