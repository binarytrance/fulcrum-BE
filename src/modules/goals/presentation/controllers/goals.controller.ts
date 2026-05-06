import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
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
  type GoalStats,
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
  paginated,
  type ApiResponse as ApiResponseType,
  type PaginatedResponse,
} from '@shared/presentation/responses/api-response';
import { Goal } from '@goals/domain/entities/goal.entity';
import {
  GoalCategory,
  GoalPriority,
  GoalProgress,
  GoalStatus,
} from '@goals/domain/types/goal.types';
import { type GoalFilter } from '@goals/domain/ports/goal-repo.port';

// ─── Swagger schema helpers ───────────────────────────────────────────────────

const ApiSuccessSchema = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema ? { data: dataSchema } : {}),
  },
});

const PaginatedSchema = (itemSchema: object) => ({
  type: 'object',
  properties: {
    items: { type: 'array', items: itemSchema },
    total: { type: 'integer', example: 42 },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 10 },
    totalPages: { type: 'integer', example: 5 },
  },
});

const GoalProgressSchema = {
  type: 'object',
  properties: {
    totalTasks: { type: 'integer', example: 7 },
    completedTasks: { type: 'integer', example: 3 },
    totalLoggedMs: { type: 'integer', example: 7200000 },
    score: { type: 'number', example: 42, description: '0–100' },
    lastComputedAt: { type: 'string', format: 'date-time' },
  },
};

const GoalResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'abc123' },
    userId: { type: 'string', example: 'user123' },
    parentGoalId: { type: 'string', nullable: true, example: null },
    title: { type: 'string', example: 'Learn TypeScript' },
    description: { type: 'string', nullable: true, example: 'Master advanced TS patterns' },
    category: { type: 'string', enum: Object.values(GoalCategory), example: GoalCategory.LEARNING },
    status: { type: 'string', enum: Object.values(GoalStatus), example: GoalStatus.ACTIVE },
    priority: { type: 'string', enum: Object.values(GoalPriority), example: GoalPriority.HIGH },
    estimatedEndDate: { type: 'string', format: 'date-time', nullable: true, example: '2026-12-31T00:00:00.000Z' },
    estimatedDuration: { type: 'integer', nullable: true, example: 3600000, description: 'milliseconds' },
    estimatedStartDate: { type: 'string', format: 'date-time', nullable: true, example: null },
    actualStartDate: { type: 'string', format: 'date-time', nullable: true, example: null },
    actualEndDate: { type: 'string', format: 'date-time', nullable: true, example: null },
    isReadyToComplete: { type: 'boolean', example: false },
    isOverdue: { type: 'boolean', example: false },
    level: { type: 'integer', example: 1, description: '1 = top-level, 2 = sub-goal, 3 = sub-sub-goal' },
    progress: GoalProgressSchema,
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const GoalStatsSchema = {
  type: 'object',
  properties: {
    total: { type: 'integer', example: 12 },
    byStatus: {
      type: 'object',
      properties: Object.fromEntries(
        Object.values(GoalStatus).map((s) => [s, { type: 'integer', example: 0 }]),
      ),
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parsePagination(page?: string, limit?: string) {
  const p = Math.max(
    1,
    parseInt(page ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE,
  );
  const l = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(limit ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );
  return { page: p, limit: l };
}

interface GoalResponse {
  id: string;
  userId: string;
  parentGoalId: string | null;
  title: string;
  description: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: GoalPriority;
  /** Planned end date for the goal; null = no deadline set */
  estimatedEndDate: Date | null;
  /** Estimated duration to complete this goal in milliseconds; null = not set */
  estimatedDuration: number | null;
  /** When the user plans to start the goal; null = not set */
  estimatedStartDate: Date | null;
  /** Actual date the goal was started; null = not yet started */
  actualStartDate: Date | null;
  /** Date the goal was completed or abandoned; null = still in progress */
  actualEndDate: Date | null;
  /** True when the goal is active and all tasks are complete (score >= 100) */
  isReadyToComplete: boolean;
  /** True when the goal deadline passed without completion (status === MISSED). */
  isOverdue: boolean;
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
    estimatedEndDate: goal.estimatedEndDate,
    estimatedDuration: goal.estimatedDuration,
    estimatedStartDate: goal.estimatedStartDate,
    actualStartDate: goal.actualStartDate,
    actualEndDate: goal.actualEndDate,
    isReadyToComplete:
      goal.progress.score >= 100 && goal.status === GoalStatus.ACTIVE,
    isOverdue: goal.status === GoalStatus.MISSED,
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
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'category', 'estimatedDuration'],
      properties: {
        title: { type: 'string', maxLength: 200, example: 'Learn TypeScript' },
        description: { type: 'string', maxLength: 1000, example: 'Master advanced TS patterns', nullable: true },
        category: { type: 'string', enum: Object.values(GoalCategory), example: GoalCategory.LEARNING },
        priority: { type: 'string', enum: Object.values(GoalPriority), example: GoalPriority.HIGH, description: 'Defaults to MEDIUM if omitted' },
        estimatedEndDate: { type: 'string', example: '2026-12-31', description: 'YYYY-MM-DD or ISO 8601 datetime' },
        estimatedDuration: { type: 'integer', example: 7200000, description: 'milliseconds — e.g. 7200000 = 2 hours' },
        estimatedStartDate: { type: 'string', example: '2026-06-01', description: 'YYYY-MM-DD or ISO 8601 datetime' },
        parentGoalId: { type: 'string', example: null, description: 'Omit for top-level goals; max nesting depth is 3' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Goal created.', schema: ApiSuccessSchema(GoalResponseSchema) })
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

  // ─── List all goals (flat) ──────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all goals for the authenticated user',
    description:
      'Returns a flat paginated list of every goal owned by the user — ' +
      'both top-level goals and sub-goals. No nested children.',
  })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', minimum: 1, default: 1 }, example: 1 })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT }, example: DEFAULT_LIMIT })
  @ApiQuery({ name: 'status', required: false, enum: GoalStatus, description: `Filter by status` })
  @ApiQuery({ name: 'category', required: false, enum: GoalCategory, description: `Filter by category` })
  @ApiResponse({ status: 200, description: 'Goals returned.', schema: ApiSuccessSchema(PaginatedSchema(GoalResponseSchema)) })
  async getAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ): Promise<ApiResponseType<PaginatedResponse<GoalResponse>>> {
    const { sub: userId } = req.user as TokenPayload;
    const pagination = parsePagination(page, limit);
    const filter: GoalFilter = {};
    if (status && Object.values(GoalStatus).includes(status as GoalStatus)) {
      filter.status = status as GoalStatus;
    }
    if (
      category &&
      Object.values(GoalCategory).includes(category as GoalCategory)
    ) {
      filter.category = category as GoalCategory;
    }
    const { items, total } = await this.getGoalsService.getAll(
      userId,
      filter,
      pagination.page,
      pagination.limit,
    );
    return paginated(
      'Goals retrieved successfully.',
      items.map(toGoalResponse),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────────
  // MUST be registered before GET /:id to avoid route shadowing.

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get goal statistics',
    description:
      'Returns total goal count and a per-status breakdown ' +
      '(ACTIVE, COMPLETED, PAUSED, ABANDONED) for the authenticated user. ' +
      'Computed in a single MongoDB aggregation.',
  })
  @ApiResponse({ status: 200, description: 'Stats returned.', schema: ApiSuccessSchema(GoalStatsSchema) })
  async getStats(@Req() req: Request): Promise<ApiResponseType<GoalStats>> {
    const { sub: userId } = req.user as TokenPayload;
    const stats = await this.getGoalsService.getStats(userId);
    return ok('Goal stats retrieved successfully.', stats);
  }

  // ─── Search ────────────────────────────────────────────────────────
  // MUST be registered before GET /:id to avoid route shadowing.

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search goals by title or description',
    description:
      'Case-insensitive substring search over `title` and `description`. ' +
      'Returns a flat paginated list (not a tree). ' +
      '`q` must be at least 1 character.',
  })
  @ApiQuery({ name: 'q', required: true, schema: { type: 'string', minLength: 1 }, description: 'Case-insensitive substring match on title and description', example: 'typescript' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', minimum: 1, default: 1 }, example: 1 })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT }, example: DEFAULT_LIMIT })
  @ApiResponse({ status: 200, description: 'Search results returned.', schema: ApiSuccessSchema(PaginatedSchema(GoalResponseSchema)) })
  @ApiResponse({ status: 400, description: 'Missing or empty query string.' })
  async search(
    @Req() req: Request,
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<PaginatedResponse<GoalResponse>>> {
    if (!q?.trim())
      throw new BadRequestException('Query parameter `q` is required.');
    const { sub: userId } = req.user as TokenPayload;
    const pagination = parsePagination(page, limit);
    const { items, total } = await this.getGoalsService.search(
      userId,
      q.trim(),
      pagination,
    );
    return paginated(
      'Search results retrieved successfully.',
      items.map(toGoalResponse),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  // ─── Get one ─────────────────────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single goal by ID' })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiResponse({ status: 200, description: 'Goal retrieved.', schema: ApiSuccessSchema(GoalResponseSchema) })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  async getOne(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<GoalResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const goal = await this.getGoalsService.getOne(id, userId);
    return ok('Goal retrieved successfully.', toGoalResponse(goal));
  }

  // ─── Subgoals ─────────────────────────────────────────────────────────────────────
  // Registered before :id so it is not shadowed.

  @Get(':id/subgoals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get direct sub-goals of a goal',
    description:
      'Returns a flat paginated list of all direct sub-goals ' +
      'under the specified goal. No further nesting.',
  })
  @ApiParam({ name: 'id', description: 'Parent goal ID' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', minimum: 1, default: 1 }, example: 1 })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT }, example: DEFAULT_LIMIT })
  @ApiResponse({ status: 200, description: 'Sub-goals returned.', schema: ApiSuccessSchema(PaginatedSchema(GoalResponseSchema)) })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  async getSubgoals(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<PaginatedResponse<GoalResponse>>> {
    const { sub: userId } = req.user as TokenPayload;
    const pagination = parsePagination(page, limit);
    const { items, total } = await this.getGoalsService.getSubgoals(
      id,
      userId,
      pagination.page,
      pagination.limit,
    );
    return paginated(
      'Sub-goals retrieved successfully.',
      items.map(toGoalResponse),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  // ─── Update ──────────────────────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a goal',
    description:
      'Status transitions are enforced: ACTIVE→PAUSED|COMPLETED|ABANDONED, ' +
      'PAUSED→ACTIVE|ABANDONED, COMPLETED→ACTIVE, ABANDONED→∅. ' +
      'Changing the estimatedEndDate queues an async AI pacing recalculation.',
  })
  @ApiParam({ name: 'id', description: 'Goal ID' })
  @ApiBody({
    description: 'All fields optional. At least one must be present.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 200, example: 'Learn TypeScript deeply' },
        description: { type: 'string', maxLength: 1000, nullable: true, example: 'Focus on generics and decorators' },
        category: { type: 'string', enum: Object.values(GoalCategory), example: GoalCategory.LEARNING },
        status: { type: 'string', enum: Object.values(GoalStatus), example: GoalStatus.PAUSED, description: 'ACTIVE→PAUSED|COMPLETED|ABANDONED; PAUSED→ACTIVE|ABANDONED; COMPLETED→ACTIVE' },
        priority: { type: 'string', enum: Object.values(GoalPriority), example: GoalPriority.MEDIUM },
        estimatedEndDate: { type: 'string', nullable: true, example: '2026-12-31', description: 'YYYY-MM-DD or ISO 8601; null to clear' },
        estimatedDuration: { type: 'integer', nullable: true, example: 7200000, description: 'milliseconds; null to clear' },
        estimatedStartDate: { type: 'string', nullable: true, example: null, description: 'YYYY-MM-DD or ISO 8601; null to clear' },
        actualStartDate: { type: 'string', nullable: true, example: null, description: 'YYYY-MM-DD or ISO 8601; null to clear' },
        actualEndDate: { type: 'string', nullable: true, example: null, description: 'YYYY-MM-DD or ISO 8601; null to clear' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Goal updated.', schema: ApiSuccessSchema(GoalResponseSchema) })
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
  @ApiResponse({ status: 200, description: 'Goal soft-deleted.', schema: ApiSuccessSchema() })
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
