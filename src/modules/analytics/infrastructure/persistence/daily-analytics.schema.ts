import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
class TimeLeakSubDoc {
  @Prop({ type: String, required: true }) startTime!: string;
  @Prop({ type: String, required: true }) endTime!: string;
  @Prop({ type: Number, required: true }) gapMinutes!: number;
}
const TimeLeakSubSchema = SchemaFactory.createForClass(TimeLeakSubDoc);

@Schema({ collection: 'daily_analytics', timestamps: false })
export class DailyAnalyticsDoc {
  static readonly name = 'DailyAnalytics';

  @Prop({ type: String, required: true }) _id!: string;
  @Prop({ type: String, required: true, index: true }) userId!: string;
  @Prop({ type: String, required: true }) date!: string;

  @Prop({ type: Number, default: 0 }) totalLoggedMinutes!: number;
  @Prop({ type: Number, default: 0 }) netFocusMinutes!: number;
  @Prop({ type: Number, default: 0 }) deepWorkMinutes!: number;
  @Prop({ type: Number, default: 0 }) shallowWorkMinutes!: number;

  @Prop({ type: Number, default: 0 }) sessionCount!: number;
  @Prop({ type: Number, default: 0 }) totalDistractions!: number;
  @Prop({ type: Number, default: 0 }) totalDistractionMinutes!: number;
  @Prop({ type: Number, default: 0 }) avgDistractionPerSession!: number;

  @Prop({ type: Number, default: 0 }) totalTaskCount!: number;
  @Prop({ type: Number, default: 0 }) plannedTaskCount!: number;
  @Prop({ type: Number, default: 0 }) unplannedTaskCount!: number;
  @Prop({ type: Number, default: 0 }) completedTaskCount!: number;
  @Prop({ type: Number, default: 0 }) unplannedPercent!: number;
  @Prop({ type: Number, default: 0 }) taskCompletionRate!: number;

  @Prop({ type: Number, default: null }) avgEfficiencyScore!: number | null;

  @Prop({ type: [TimeLeakSubSchema], default: [] })
  timeLeaks!: TimeLeakSubDoc[];

  @Prop({ type: Date, required: true }) computedAt!: Date;
}

export type DailyAnalyticsDocument = HydratedDocument<DailyAnalyticsDoc>;
export const DailyAnalyticsSchema =
  SchemaFactory.createForClass(DailyAnalyticsDoc);

// Compound unique: one document per user per day
DailyAnalyticsSchema.index({ userId: 1, date: 1 }, { unique: true });
