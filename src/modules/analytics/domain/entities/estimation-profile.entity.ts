import type {
  EstimationProfileFields,
  AccuracyEntry,
  EstimationTrend,
} from '@analytics/domain/types/analytics.types';

export class EstimationProfile {
  readonly id: string;
  readonly userId: string;
  readonly recentAccuracies: AccuracyEntry[];
  readonly rollingAverage: number | null;
  readonly trend: EstimationTrend | null;
  readonly updatedAt: Date;

  constructor(fields: EstimationProfileFields) {
    this.id = fields.id;
    this.userId = fields.userId;
    this.recentAccuracies = fields.recentAccuracies;
    this.rollingAverage = fields.rollingAverage;
    this.trend = fields.trend;
    this.updatedAt = fields.updatedAt;
  }

  toFields(): EstimationProfileFields {
    return {
      id: this.id,
      userId: this.userId,
      recentAccuracies: this.recentAccuracies,
      rollingAverage: this.rollingAverage,
      trend: this.trend,
      updatedAt: this.updatedAt,
    };
  }
}
