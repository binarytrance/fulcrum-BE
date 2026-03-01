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

export interface GetHabitsInput {
  userId: string;
  goalId?: string;
}

@Injectable()
export class GetHabitsService {
  constructor(
    @Inject(HABIT_REPO_PORT) private readonly habitRepo: IHabitRepository,
  ) {}

  async execute(input: GetHabitsInput): Promise<Habit[]> {
    if (input.goalId) {
      const habits = await this.habitRepo.findByGoal(input.goalId);
      // Only return habits that belong to the requesting user
      return habits.filter((h) => h.userId === input.userId);
    }
    return this.habitRepo.findByUser(input.userId);
  }

  async getOne(id: string, userId: string): Promise<Habit> {
    const habit = await this.habitRepo.findById(id);
    if (!habit || habit.deletedAt)
      throw new NotFoundException('Habit not found.');
    if (habit.userId !== userId) throw new ForbiddenException('Access denied.');
    return habit;
  }
}
