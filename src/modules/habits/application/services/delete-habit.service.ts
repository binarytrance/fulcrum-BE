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

@Injectable()
export class DeleteHabitService {
  constructor(
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
  ) {}

  async execute(id: string, userId: string): Promise<Habit> {
    const habit = await this.habitRepo.findById(id);
    if (!habit || habit.deletedAt)
      throw new NotFoundException('Habit not found.');
    if (habit.userId !== userId) throw new ForbiddenException('Access denied.');
    return this.habitRepo.save(habit.archive());
  }
}
