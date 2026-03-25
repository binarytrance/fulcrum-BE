import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
class DayStatSubDoc {
  @Prop({ type: String, required: true }) date!: string;
  @Prop({ type: Number, required: true }) minutes!: number;
}
const DayStatSubSchema = SchemaFactory.createForClass(DayStatSubDoc);

@Schema({ _id: false })
class GoalBreakdownSubDoc {
  @Prop({ type: String, required: true }) goalId!: string;
  @Prop({ type: String, required: true }) goalTitle!: string;
  @Prop({ type: Number, required: true }) minutesLogged!: number;
}
const GoalBreakdownSubSchema =
  SchemaFactory.createForClass(GoalBreakdownSubDoc);

@Schema({ collection: 'weekly_analytics', timestamps: false })
export class WeeklyAnalyticsDoc {
  static readonly name = 'WeeklyAnalytics';

  @Prop({ type: String, required: true }) _id!: string;
  @Prop({ type: String, required: true, index: true }) userId!: string;
  @Prop({ type: String, required: true }) weekStart!: string;

  @Prop({ type: Number, default: 0 }) totalLoggedMinutes!: number;
  @Prop({ type: Number, default: 0 }) netFocusMinutes!: number;
  @Prop({ type: Number, default: 0 }) deepWorkMinutes!: number;
  @Prop({ type: Number, default: 0 }) totalSessions!: number;
  @Prop({ type: Number, default: 0 }) totalCompletedTasks!: number;
  @Prop({ type: Number, default: 0 }) avgDailyMinutes!: number;

  @Prop({ type: DayStatSubSchema, default: null })
  bestDay!: DayStatSubDoc | null;
  @Prop({ type: DayStatSubSchema, default: null })
  worstDay!: DayStatSubDoc | null;
  @Prop({ type: Number, default: 0 }) timeLeaksIdentified!: number;

  @Prop({ type: [GoalBreakdownSubSchema], default: [] })
  goalBreakdown!: GoalBreakdownSubDoc[];

  @Prop({ type: Date, required: true }) computedAt!: Date;
}

export type WeeklyAnalyticsDocument = HydratedDocument<WeeklyAnalyticsDoc>;
export const WeeklyAnalyticsSchema =
  SchemaFactory.createForClass(WeeklyAnalyticsDoc);

// Compound unique: one document per user per week
WeeklyAnalyticsSchema.index({ userId: 1, weekStart: 1 }, { unique: true });
