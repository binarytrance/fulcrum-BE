import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HABIT_OCCURRENCE_REPO_PORT,
  type IHabitOccurrenceRepository,
} from '@habits/domain/ports/habit-occurrence-repo.port';
import {
  ANALYTICS_EVENT_PUBLISHER_PORT,
  type IAnalyticsEventPublisher,
} from '@analytics/domain/ports/analytics-event-publisher.port';
import type { HabitOccurrence } from '@habits/domain/entities/habit-occurrence.entity';

@Injectable()
export class SkipOccurrenceService {
  constructor(
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
    @Inject(ANALYTICS_EVENT_PUBLISHER_PORT)
    private readonly analyticsEventPublisher: IAnalyticsEventPublisher,
  ) {}

  async execute(
    occurrenceId: string,
    userId: string,
  ): Promise<HabitOccurrence> {
    const occurrence = await this.occurrenceRepo.findById(occurrenceId);
    if (!occurrence) throw new NotFoundException('Habit occurrence not found.');
    if (occurrence.userId !== userId)
      throw new ForbiddenException('Access denied.');
    const skipped = occurrence.skip();
    const saved = await this.occurrenceRepo.save(skipped);
    await this.analyticsEventPublisher.queueDailyCompute(userId, saved.date);
    return saved;
  }
}
