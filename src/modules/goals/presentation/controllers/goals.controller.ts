import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '@auth/presentation/guards/jwt-auth.guard';
import type { TokenPayload } from '@auth/domain/types/token.types';

import { CreateGoalService } from '@goals/application/services/create-goal.service';
import { UpdateGoalService } from '@goals/application/services/update-goal.service';
import { DeleteGoalService } from '@goals/application/services/delete-goal.service';
import {
  GetGoalsService,
  type GoalTreeNode,
} from '@goals/application/services/get-goals.service';

import {
  type CreateGoalDto,
  CreateGoalSchema,
} from '@goals/presentation/dtos/create-goal.dto';
import {
  type UpdateGoalDto,
  UpdateGoalSchema,
} from '@goals/presentation/dtos/update-goal.dto';

import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import {
  ok,
  type ApiResponse as ApiResponseType,
} from '@shared/presentation/responses/api-response';
import { Goal } from '@goals/domain/entities/goal.entity';
import {
  GoalCategory,
  GoalPriority,
  GoalProgress,
  GoalStatus,
} from '@goals/domain/types/goal.types';

interface GoalResponse {
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
}

function toGoalResponse(goal: Goal): GoalResponse {
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
  };
}

@ApiTags('Goals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(
    private readonly createGoalService: CreateGoalService,
    private readonly updateGoalService: UpdateGoalService,
    private readonly deleteGoalService: DeleteGoalService,
    private readonly getGoalsService: GetGoalsService,
  ) {}

  // ─── Create ────────────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a goal or sub-goal (provide parentGoalId for sub-goals)',
  })
  @ApiResponse({ status: 201, description: 'Goal created.' })
  @ApiResponse({
    status: 400,
    description: 'Nesting limit exceeded or validation error.',
  })
  @ApiResponse({ status: 404, description: 'Parent goal not found.' })
  async create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(CreateGoalSchema)) dto: CreateGoalDto,
  ): Promise<ApiResponseType<GoalResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const goal = await this.createGoalService.execute({ userId, ...dto });
    return ok('Goal created successfully.', toGoalResponse(goal));
  }

  // ─── Goal tree ──────────────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get goal tree for the authenticated user',
    description:
      'Returns the full goal hierarchy as a nested tree. ' +
      'Results are cached in Redis (30 s TTL). ' +
      'Each node includes a `children` array of sub-goals.',
  })
  @ApiResponse({ status: 200, description: 'Goal tree returned.' })
  async getTree(@Req() req: Request): Promise<ApiResponseType<GoalTreeNode[]>> {
    const { sub: userId } = req.user as TokenPayload;
    const tree = await this.getGoalsService.getTree(userId);
    return ok('Goal tree retrieved successfully.', tree);
  }

  // ─── Get one ─────────────────────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single goal by ID' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Goal retrieved.' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  async getOne(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<GoalResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const goal = await this.getGoalsService.getOne(id, userId);
    return ok('Goal retrieved successfully.', toGoalResponse(goal));
  }

  // ─── Update ──────────────────────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a goal',
    description:
      'Status transitions are enforced: ACTIVE→PAUSED|COMPLETED|ABANDONED, ' +
      'PAUSED→ACTIVE|ABANDONED, COMPLETED→ACTIVE, ABANDONED→∅. ' +
      'Changing the deadline queues an async AI pacing recalculation.',
  })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Goal updated.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateGoalSchema)) dto: UpdateGoalDto,
  ): Promise<ApiResponseType<GoalResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const goal = await this.updateGoalService.execute(id, userId, dto);
    return ok('Goal updated successfully.', toGoalResponse(goal));
  }

  // ─── Soft-delete ─────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a goal and all its sub-goals',
    description:
      'Sets deletedAt on the goal and all descendants. ' +
      'Data is preserved in MongoDB — never permanently removed.',
  })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Goal soft-deleted.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  async delete(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType> {
    const { sub: userId } = req.user as TokenPayload;
    await this.deleteGoalService.execute(id, userId);
    return ok('Goal deleted successfully.');
  }
}
