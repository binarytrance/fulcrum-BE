import type { EstimationProfile } from '@analytics/domain/entities/estimation-profile.entity';

export const ESTIMATION_PROFILE_REPO_PORT = Symbol('ESTIMATION_PROFILE_REPO_PORT');

export interface IEstimationProfileRepository {
  findByUserId(userId: string): Promise<EstimationProfile | null>;
}
