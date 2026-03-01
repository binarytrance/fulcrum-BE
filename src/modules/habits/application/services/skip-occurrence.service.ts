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
import type { HabitOccurrence } from '@habits/domain/entities/habit-occurrence.entity';

@Injectable()
export class SkipOccurrenceService {
  constructor(
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
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
    return this.occurrenceRepo.save(skipped);
  }
}
