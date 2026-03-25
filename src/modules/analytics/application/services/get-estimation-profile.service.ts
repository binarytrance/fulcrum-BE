import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ESTIMATION_PROFILE_REPO_PORT,
  type IEstimationProfileRepository,
} from '@analytics/domain/ports/estimation-profile-repo.port';
import type { EstimationProfile } from '@analytics/domain/entities/estimation-profile.entity';

@Injectable()
export class GetEstimationProfileService {
  constructor(
    @Inject(ESTIMATION_PROFILE_REPO_PORT)
    private readonly repo: IEstimationProfileRepository,
  ) {}

  async getForUser(userId: string): Promise<EstimationProfile> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException(
        'No estimation profile yet. Complete at least one task to start tracking accuracy.',
      );
    }
    return profile;
  }
}
