import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Goal } from '@goals/domain/entities/goal.entity';
import {
  GOAL_REPO_PORT,
  type IGoalRepository,
} from '@goals/domain/ports/goal-repo.port';
import { GoalCacheService } from '@goals/infrastructure/cache/goal-cache.service';
import {
  GoalCategory,
  GoalPriority,
  GoalProgress,
  GoalStatus,
} from '@goals/domain/types/goal.types';

export interface GoalTreeNode {
  id: string;
  userId: string;
  parentGoalId: string | null;
  title: string;
  description: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: GoalPriority;
  deadline: Date | null;
  estimatedHours: number | null;
  level: number;
  progress: GoalProgress;
  createdAt: Date;
  updatedAt: Date;
  children: GoalTreeNode[];
}

function goalToNode(goal: Goal): GoalTreeNode {
  return {
    id: goal.id,
    userId: goal.userId,
    parentGoalId: goal.parentGoalId,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    status: goal.status,
    priority: goal.priority,
    deadline: goal.deadline,
    estimatedHours: goal.estimatedHours,
    level: goal.level,
    progress: goal.progress,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    children: [],
  };
}

@Injectable()
export class GetGoalsService {
  constructor(
    @Inject(GOAL_REPO_PORT)
    private readonly goalRepo: IGoalRepository,
    private readonly goalCache: GoalCacheService,
  ) {}

  /**
   * Returns the full goal tree for a user.
   * - Tries Redis cache first (30 s TTL).
   * - On miss: fetches all goals from MongoDB, builds tree in JS, writes to cache.
   * Never issues recursive DB queries — one flat fetch, tree assembled in memory.
   */
  async getTree(userId: string): Promise<GoalTreeNode[]> {
    const cached = await this.goalCache.getTree<GoalTreeNode[]>(userId);
    if (cached) return cached;

    const goals = await this.goalRepo.findAllByUserId(userId);
    const tree = this.buildTree(goals);
    await this.goalCache.setTree(userId, tree);
    return tree;
  }

  /** Return a single goal by ID, verifying ownership */
  async getOne(goalId: string, userId: string): Promise<Goal> {
    const goal = await this.goalRepo.findById(goalId);
    if (!goal) throw new NotFoundException('Goal not found.');
    if (goal.userId !== userId) throw new ForbiddenException('Access denied.');
    return goal;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildTree(goals: Goal[]): GoalTreeNode[] {
    const nodeMap = new Map<string, GoalTreeNode>();
    const roots: GoalTreeNode[] = [];

    // First pass: create all nodes
    for (const goal of goals) {
      nodeMap.set(goal.id, goalToNode(goal));
    }

    // Second pass: wire parent → children
    for (const goal of goals) {
      const node = nodeMap.get(goal.id)!;
      if (goal.parentGoalId) {
        const parentNode = nodeMap.get(goal.parentGoalId);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // Orphaned node (parent soft-deleted) — surface as root
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
