import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HABIT_REPO_PORT,
  type IHabitRepository,
} from '@habits/domain/ports/habit-repo.port';
import {
  TASK_CAPACITY_PORT,
  type ITaskCapacityPort,
} from '@habits/domain/ports/task-capacity.port';
import {
  HABIT_CAPACITY_PORT,
  type IHabitCapacityPort,
} from '@habits/domain/ports/habit-capacity.port';
import type { Habit } from '@habits/domain/entities/habit.entity';
import { HabitFrequency } from '@habits/domain/types/habit.types';

const MAX_DAY_MS = 24 * 60 * 60 * 1000;

export interface UpdateHabitInput {
  id: string;
  userId: string;
  title?: string;
  description?: string | null;
  targetDuration?: number;
}

export interface PauseResumeInput {
  id: string;
  userId: string;
}

@Injectable()
export class UpdateHabitService {
  constructor(
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
    @Inject(TASK_CAPACITY_PORT)
    private readonly taskCapacity: ITaskCapacityPort,
    @Inject(HABIT_CAPACITY_PORT)
    private readonly habitCapacity: IHabitCapacityPort,
  ) {}

  async update(input: UpdateHabitInput): Promise<Habit> {
    const habit = await this.findOwned(input.id, input.userId);

    // Re-check 24h cap if targetDuration is being increased and habit runs today.
    if (
      input.targetDuration !== undefined &&
      input.targetDuration !== habit.targetDuration
    ) {
      const today = new Date();
      const isScheduledToday =
        habit.frequency === HabitFrequency.DAILY ||
        habit.daysOfWeek.includes(today.getUTCDay());

      if (isScheduledToday) {
        const [taskMs, habitMs] = await Promise.all([
          this.taskCapacity.getCommittedTaskMs(input.userId, today),
          this.habitCapacity.getPendingHabitMs(input.userId, today),
        ]);
        // Remove this habit's current contribution before adding new value.
        const otherHabitMs = habitMs - habit.targetDuration * 60_000;
        const newHabitMs = input.targetDuration * 60_000;
        if (taskMs + otherHabitMs + newHabitMs > MAX_DAY_MS) {
          const todayStr = today.toISOString().slice(0, 10);
          throw new BadRequestException(
            `Updating this habit's duration would exceed 24 hours of commitment for today (${todayStr}). ` +
              'Free up capacity by removing tasks or habits scheduled for today.',
          );
        }
      }
    }

    const updated = habit.update({
      title: input.title,
      description: input.description,
      targetDuration: input.targetDuration,
    });
    return this.habitRepo.save(updated);
  }

  async pause(input: PauseResumeInput): Promise<Habit> {
    const habit = await this.findOwned(input.id, input.userId);
    return this.habitRepo.save(habit.pause());
  }

  async resume(input: PauseResumeInput): Promise<Habit> {
    const habit = await this.findOwned(input.id, input.userId);
    return this.habitRepo.save(habit.resume());
  }

  private async findOwned(id: string, userId: string): Promise<Habit> {
    const habit = await this.habitRepo.findById(id);
    if (!habit || habit.deletedAt)
      throw new NotFoundException('Habit not found.');
    if (habit.userId !== userId) throw new ForbiddenException('Access denied.');
    return habit;
  }
}
