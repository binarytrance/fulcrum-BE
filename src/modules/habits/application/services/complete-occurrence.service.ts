import {
  BadRequestException,
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
  HABIT_REPO_PORT,
  type IHabitRepository,
} from '@habits/domain/ports/habit-repo.port';
import {
  HABIT_EVENT_PUBLISHER_PORT,
  type IHabitEventPublisher,
} from '@habits/domain/ports/habit-event-publisher.port';
import type { HabitOccurrence } from '@habits/domain/entities/habit-occurrence.entity';
import { COMPLETION_GRACE_PERCENT } from '@habits/domain/types/habit.types';

export interface CompleteOccurrenceInput {
  occurrenceId: string;
  userId: string;
  durationMinutes: number;
  sessionId?: string;
  note?: string;
}

@Injectable()
export class CompleteOccurrenceService {
  constructor(
    @Inject(HABIT_OCCURRENCE_REPO_PORT)
    private readonly occurrenceRepo: IHabitOccurrenceRepository,
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
    @Inject(HABIT_EVENT_PUBLISHER_PORT)
    private readonly eventPublisher: IHabitEventPublisher,
  ) {}

  async execute(input: CompleteOccurrenceInput): Promise<HabitOccurrence> {
    const occurrence = await this.occurrenceRepo.findById(input.occurrenceId);
    if (!occurrence) throw new NotFoundException('Habit occurrence not found.');
    if (occurrence.userId !== input.userId)
      throw new ForbiddenException('Access denied.');

    const habit = await this.habitRepo.findById(occurrence.habitId);
    if (!habit) throw new NotFoundException('Parent habit not found.');

    // Enforce the 80% grace window
    const minRequired = Math.floor(
      habit.targetDuration * COMPLETION_GRACE_PERCENT,
    );
    if (input.durationMinutes < minRequired) {
      throw new BadRequestException(
        `Duration too short. Minimum required: ${minRequired} min ` +
          `(${COMPLETION_GRACE_PERCENT * 100}% of target ${habit.targetDuration} min).`,
      );
    }

    const completed = occurrence.complete({
      durationMinutes: input.durationMinutes,
      sessionId: input.sessionId,
      note: input.note,
    });
    const saved = await this.occurrenceRepo.save(completed);

    // Fire-and-forget streak recalculation
    await this.eventPublisher.publishOccurrenceCompleted({
      habitId: habit.id,
      occurrenceId: saved.id,
      userId: input.userId,
      date: saved.date,
      durationMinutes: input.durationMinutes,
      sessionId: input.sessionId ?? null,
    });

    return saved;
  }
}
