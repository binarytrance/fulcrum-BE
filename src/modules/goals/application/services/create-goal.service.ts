import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Goal } from '@goals/domain/entities/goal.entity';
import {
  GOAL_REPO_PORT,
  type IGoalRepository,
} from '@goals/domain/ports/goal-repo.port';
import {
  GoalCategory,
  GoalPriority,
  GoalStatus,
} from '@goals/domain/types/goal.types';
import {
  ID_GENERATOR_PORT,
  type IIDGenerator,
} from '@shared/domain/ports/id-generator.port';
import {
  GOAL_CACHE_PORT,
  type IGoalCachePort,
} from '@goals/domain/ports/goal-cache.port';

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  category: GoalCategory;
  priority?: GoalPriority;
  deadline?: Date;
  estimatedHours?: number;
  /** If provided, this goal becomes a sub-goal of the given parent */
  parentGoalId?: string;
}

@Injectable()
export class CreateGoalService {
  constructor(
    @Inject(GOAL_REPO_PORT)
    private readonly goalRepo: IGoalRepository,
    @Inject(ID_GENERATOR_PORT)
    private readonly idGenerator: IIDGenerator,
    @Inject(GOAL_CACHE_PORT)
    private readonly goalCache: IGoalCachePort,
  ) {}

  async execute(input: CreateGoalInput): Promise<Goal> {
    let level: 1 | 2 | 3 = 1;

    if (input.parentGoalId) {
      const parent = await this.goalRepo.findById(input.parentGoalId);
      if (!parent) throw new NotFoundException('Parent goal not found.');
      if (parent.userId !== input.userId)
        throw new NotFoundException('Parent goal not found.');
      if (parent.level >= 3) {
        throw new BadRequestException(
          'Goal nesting limit reached. Sub-goals can only be nested up to 3 levels deep.',
        );
      }
      level = (parent.level + 1) as 2 | 3;
    }

    // Goal.create() initialises progress with all zeros automatically
    const goal = Goal.create({
      id: this.idGenerator.generate(),
      userId: input.userId,
      parentGoalId: input.parentGoalId ?? null,
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      status: GoalStatus.ACTIVE,
      priority: input.priority ?? GoalPriority.MEDIUM,
      deadline: input.deadline ?? null,
      estimatedHours: input.estimatedHours ?? null,
      level,
    });

    await this.goalRepo.create(goal);
    // Bust cached tree so next GET /goals reflects new goal
    await this.goalCache.invalidate(input.userId);
    return goal;
  }
}
