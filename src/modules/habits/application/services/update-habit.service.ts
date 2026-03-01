import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HABIT_REPO_PORT,
  type IHabitRepository,
} from '@habits/domain/ports/habit-repo.port';
import type { Habit } from '@habits/domain/entities/habit.entity';

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
  ) {}

  async update(input: UpdateHabitInput): Promise<Habit> {
    const habit = await this.findOwned(input.id, input.userId);
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
