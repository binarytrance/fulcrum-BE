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

import { CreateTaskService } from '@tasks/application/services/create-task.service';
import { UpdateTaskService } from '@tasks/application/services/update-task.service';
import { CompleteTaskService } from '@tasks/application/services/complete-task.service';
import { DeleteTaskService } from '@tasks/application/services/delete-task.service';
import {
  GetTasksService,
  type DailyTaskSummary,
  type TaskStats,
} from '@tasks/application/services/get-tasks.service';
import {
  type CreateTaskDto,
  CreateTaskSchema,
} from '@tasks/presentation/dtos/create-task.dto';
import {
  type UpdateTaskDto,
  UpdateTaskSchema,
} from '@tasks/presentation/dtos/update-task.dto';
import {
  type CompleteTaskDto,
  CompleteTaskSchema,
} from '@tasks/presentation/dtos/complete-task.dto';
import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import {
  ok,
  paginated,
  type ApiResponse as ApiResponseType,
  type PaginatedResponse,
} from '@shared/presentation/responses/api-response';
import { TaskStatus, TaskType } from '@tasks/domain/types/task.types';
import {
  ApiSuccessSchema,
  PaginatedSchema,
  TaskResponseSchema,
  DailyTaskSummarySchema,
  TaskStatsSchema,
  CreateTaskBodySchema,
  CompleteTaskBodySchema,
  UpdateTaskBodySchema,
  type TaskResponse,
  toTaskResponse,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  parsePagination,
} from '@tasks/presentation/dtos/task-response.schemas';

// Schemas, response types, mappers, and pagination helpers imported from
// @tasks/presentation/dtos/task-response.schemas

@ApiTags('Tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly createTaskService: CreateTaskService,
    private readonly updateTaskService: UpdateTaskService,
    private readonly completeTaskService: CompleteTaskService,
    private readonly deleteTaskService: DeleteTaskService,
    private readonly getTasksService: GetTasksService,
  ) {}

  // ─── Create ────────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a task',
    description:
      'Creates a planned or unplanned task. ' +
      'If goalId is provided it must belong to the authenticated user. ' +
      'type is auto-derived (PLANNED if goalId/scheduledFor present, else UNPLANNED) unless explicitly set.',
  })
  @ApiBody({ schema: CreateTaskBodySchema })
  @ApiResponse({
    status: 201,
    description: 'Task created.',
    schema: ApiSuccessSchema(TaskResponseSchema),
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  async create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(CreateTaskSchema)) dto: CreateTaskDto,
  ): Promise<ApiResponseType<TaskResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const task = await this.createTaskService.execute({ userId, ...dto });
    const goalTitle = await this.getTasksService.fetchGoalTitle(task.goalId);
    return ok('Task created successfully.', toTaskResponse(task, goalTitle));
  }

  // ─── Daily planner (dedicated route) ──────────────────────────────────────────
  // MUST be before GET /:id — registered as GET /tasks/daily

  @Get('daily')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get tasks for a specific date (daily planner)',
    description:
      'Returns all tasks scheduled for the given date. ' +
      'Returns a trimmed DTO — this is the hot-path endpoint. ' +
      'Results are Redis-cached with a 60 s TTL.',
  })
  @ApiQuery({
    name: 'date',
    required: true,
    schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    example: '2026-05-08',
    description: 'YYYY-MM-DD',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks returned.',
    schema: ApiSuccessSchema({ type: 'array', items: DailyTaskSummarySchema }),
  })
  @ApiResponse({ status: 400, description: 'Invalid or missing date.' })
  async getByDate(
    @Req() req: Request,
    @Query('date') dateStr: string,
  ): Promise<ApiResponseType<DailyTaskSummary[]>> {
    if (!dateStr)
      throw new BadRequestException('Query parameter `date` is required.');
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }
    const { sub: userId } = req.user as TokenPayload;
    const summaries = await this.getTasksService.getByDate(userId, date);
    return ok('Tasks retrieved successfully.', summaries);
  }

  // ─── List / filter (paginated) ─────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List tasks',
    description:
      'Returns all non-deleted tasks for the authenticated user, with optional ' +
      'filtering by `type`, `status`, or `goalId`. Results are paginated.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TaskType,
    description: 'Filter by task type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TaskStatus,
    description: 'Filter by task status (combinable with type)',
  })
  @ApiQuery({
    name: 'goalId',
    required: false,
    schema: { type: 'string' },
    description: 'Filter by linked goal ID',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    example: '2026-05-08',
    description: 'Filter by scheduledFor calendar day (YYYY-MM-DD, UTC)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', minimum: 1, default: 1 },
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: MAX_LIMIT,
      default: DEFAULT_LIMIT,
    },
    example: DEFAULT_LIMIT,
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks returned.',
    schema: ApiSuccessSchema(PaginatedSchema(TaskResponseSchema)),
  })
  async list(
    @Req() req: Request,
    @Query('type') type?: TaskType,
    @Query('status') status?: TaskStatus,
    @Query('goalId') goalId?: string,
    @Query('date') dateStr?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<PaginatedResponse<TaskResponse>>> {
    const { sub: userId } = req.user as TokenPayload;
    const pagination = parsePagination(page, limit);
    let scheduledFor: Date | undefined;
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
      }
      scheduledFor = parsed;
    }
    const { items, total, goalTitles } = await this.getTasksService.getByFilter(
      userId,
      { type, status, goalId, scheduledFor },
      pagination,
    );
    return paginated(
      'Tasks retrieved successfully.',
      items.map((t) =>
        toTaskResponse(t, goalTitles.get(t.goalId ?? '') ?? null),
      ),
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
    summary: 'Get task statistics',
    description:
      'Returns total task count, a per-status breakdown ' +
      '(PENDING, IN_PROGRESS, COMPLETED, CANCELLED) and a per-type breakdown ' +
      '(PLANNED, UNPLANNED) for the authenticated user. ' +
      'Computed in a single MongoDB aggregation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Stats returned.',
    schema: ApiSuccessSchema(TaskStatsSchema),
  })
  async getStats(@Req() req: Request): Promise<ApiResponseType<TaskStats>> {
    const { sub: userId } = req.user as TokenPayload;
    const stats = await this.getTasksService.getStats(userId);
    return ok('Task stats retrieved successfully.', stats);
  }

  // ─── Search ─────────────────────────────────────────────────────────────────────
  // MUST be registered before GET /:id to avoid route shadowing.

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search tasks by title or description',
    description:
      'Case-insensitive substring search over `title` and `description`. ' +
      'Returns a flat paginated list. ' +
      '`q` must be at least 1 character.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    schema: { type: 'string', minLength: 1 },
    description: 'Case-insensitive substring match on title and description',
    example: 'unit tests',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', minimum: 1, default: 1 },
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: MAX_LIMIT,
      default: DEFAULT_LIMIT,
    },
    example: DEFAULT_LIMIT,
  })
  @ApiResponse({
    status: 200,
    description: 'Search results returned.',
    schema: ApiSuccessSchema(PaginatedSchema(TaskResponseSchema)),
  })
  @ApiResponse({ status: 400, description: 'Missing or empty query string.' })
  async search(
    @Req() req: Request,
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<PaginatedResponse<TaskResponse>>> {
    if (!q?.trim())
      throw new BadRequestException('Query parameter `q` is required.');
    const { sub: userId } = req.user as TokenPayload;
    const pagination = parsePagination(page, limit);
    const { items, total, goalTitles } = await this.getTasksService.search(
      userId,
      q.trim(),
      pagination,
    );
    return paginated(
      'Search results retrieved successfully.',
      items.map((t) =>
        toTaskResponse(t, goalTitles.get(t.goalId ?? '') ?? null),
      ),
      total,
      pagination.page,
      pagination.limit,
    );
  }

  // ─── Get one ─────────────────────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single task by ID (full detail)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task returned.',
    schema: ApiSuccessSchema(TaskResponseSchema),
  })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async getOne(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<TaskResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const { task, goalTitle } = await this.getTasksService.getOne(id, userId);
    return ok('Task retrieved successfully.', toTaskResponse(task, goalTitle));
  }

  // ─── Complete (dedicated endpoint) ───────────────────────────────────────────────
  // Must be registered BEFORE PATCH /:id to avoid route shadowing

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete a task',
    description:
      'Marks the task as COMPLETED and computes efficiencyScore = ' +
      'round((estimatedDuration / actualDuration) * 100). ' +
      'If actualDuration is omitted, estimatedDuration is used as a placeholder ' +
      'until Phase 4 (Sessions) backfills the real value. ' +
      'Triggers an async goal progress recomputation job if the task is linked to a goal.',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiBody({
    description:
      'Body is optional — send an empty object {} if you have no actual duration yet.',
    schema: CompleteTaskBodySchema,
  })
  @ApiResponse({
    status: 200,
    description: 'Task completed.',
    schema: ApiSuccessSchema(TaskResponseSchema),
  })
  @ApiResponse({
    status: 400,
    description: 'Task cannot be completed from its current status.',
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async complete(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CompleteTaskSchema)) dto: CompleteTaskDto,
  ): Promise<ApiResponseType<TaskResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const task = await this.completeTaskService.execute(
      id,
      userId,
      dto.actualDuration,
    );
    const goalTitle = await this.getTasksService.fetchGoalTitle(task.goalId);
    return ok('Task completed successfully.', toTaskResponse(task, goalTitle));
  }

  // ─── Update ──────────────────────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a task',
    description:
      'Partial update. Status machine: PENDING→IN_PROGRESS|CANCELLED, ' +
      'IN_PROGRESS→PENDING|CANCELLED. ' +
      'To complete a task use PATCH /tasks/:id/complete.',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiBody({
    description: 'All fields optional. At least one must be present.',
    schema: UpdateTaskBodySchema,
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated.',
    schema: ApiSuccessSchema(TaskResponseSchema),
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema)) dto: UpdateTaskDto,
  ): Promise<ApiResponseType<TaskResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const task = await this.updateTaskService.execute(id, userId, dto);
    const goalTitle = await this.getTasksService.fetchGoalTitle(task.goalId);
    return ok('Task updated successfully.', toTaskResponse(task, goalTitle));
  }

  // ─── Soft-delete ─────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a task',
    description:
      'Sets deletedAt. Data is preserved in MongoDB — never permanently removed.',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task deleted.',
    schema: ApiSuccessSchema(),
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async delete(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType> {
    const { sub: userId } = req.user as TokenPayload;
    await this.deleteTaskService.execute(id, userId);
    return ok('Task deleted successfully.');
  }
}
