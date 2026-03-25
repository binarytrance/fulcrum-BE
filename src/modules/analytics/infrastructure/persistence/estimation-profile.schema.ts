import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
class AccuracyEntrySubDoc {
  @Prop({ type: String, required: true }) taskId!: string;
  @Prop({ type: Date, required: true }) date!: Date;
  @Prop({ type: Number, required: true }) estimated!: number;
  @Prop({ type: Number, required: true }) actual!: number;
  @Prop({ type: Number, required: true }) accuracy!: number;
}
const AccuracyEntrySubSchema =
  SchemaFactory.createForClass(AccuracyEntrySubDoc);

@Schema({ collection: 'estimation_profiles', timestamps: false })
export class EstimationProfileDoc {
  static readonly name = 'EstimationProfile';

  @Prop({ type: String, required: true }) _id!: string;
  @Prop({ type: String, required: true, unique: true, index: true })
  userId!: string;

  @Prop({ type: [AccuracyEntrySubSchema], default: [] })
  recentAccuracies!: AccuracyEntrySubDoc[];

  @Prop({ type: Number, default: null }) rollingAverage!: number | null;
  @Prop({ type: String, default: null }) trend!: string | null;
  @Prop({ type: Date, required: true }) updatedAt!: Date;
}

export type EstimationProfileDocument = HydratedDocument<EstimationProfileDoc>;
export const EstimationProfileSchema =
  SchemaFactory.createForClass(EstimationProfileDoc);
