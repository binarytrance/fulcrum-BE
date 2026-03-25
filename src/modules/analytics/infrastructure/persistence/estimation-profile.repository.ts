import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EstimationProfile } from '@analytics/domain/entities/estimation-profile.entity';
import type { IEstimationProfileRepository } from '@analytics/domain/ports/estimation-profile-repo.port';
import {
  EstimationProfileDoc,
  type EstimationProfileDocument,
} from '@analytics/infrastructure/persistence/estimation-profile.schema';
import type {
  EstimationProfileFields,
  EstimationTrend,
  AccuracyEntry,
} from '@analytics/domain/types/analytics.types';

type ProfileLean = {
  _id: string;
  userId: string;
  recentAccuracies: AccuracyEntry[];
  rollingAverage: number | null;
  trend: string | null;
  updatedAt: Date;
};

function toDomain(doc: ProfileLean): EstimationProfile {
  const fields: EstimationProfileFields = {
    id: doc._id,
    userId: doc.userId,
    recentAccuracies: doc.recentAccuracies ?? [],
    rollingAverage: doc.rollingAverage,
    trend: (doc.trend as EstimationTrend | null) ?? null,
    updatedAt: doc.updatedAt,
  };
  return new EstimationProfile(fields);
}

@Injectable()
export class EstimationProfileRepository implements IEstimationProfileRepository {
  constructor(
    @InjectModel(EstimationProfileDoc.name)
    private readonly model: Model<EstimationProfileDocument>,
  ) {}

  async findByUserId(userId: string): Promise<EstimationProfile | null> {
    const doc = await this.model.findOne({ userId }).lean<ProfileLean>();
    return doc ? toDomain(doc) : null;
  }
}
