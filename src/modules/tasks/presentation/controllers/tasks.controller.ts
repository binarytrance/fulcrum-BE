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
import { ZodValidationPipe } from '@shared/presentation/pipes/zod-validation.pipe';
import {
  ok,
  paginated,
  type ApiResponse as ApiResponseType,
  type PaginatedResponse,
} from '@shared/presentation/responses/api-response';
import { Task } from '@tasks/domain/entities/task.entity';
import type { UpdateTaskInput } from '@tasks/application/services/update-task.service';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@tasks/domain/types/task.types';

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
    total: { type: 'integer', example: 30 },
    page: { type: 'integer', example: 1 },
    limit: { type: 'integer', example: 10 },
    totalPages: { type: 'integer', example: 3 },
  },
});

const TaskResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'tsk_abc123' },
    userId: { type: 'string', example: 'user_xyz' },
    goal: {
      type: 'object',
      properties: {
        id: { type: 'string', nullable: true, example: null },
        title: { type: 'string', nullable: true, example: 'Learn TypeScript' },
      },
    },
    title: { type: 'string', example: 'Write unit tests' },
    description: { type: 'string', nullable: true, example: null },
    status: { type: 'string', enum: Object.values(TaskStatus), example: TaskStatus.PENDING },
    priority: { type: 'string', enum: Object.values(TaskPriority), example: TaskPriority.HIGH },
    type: { type: 'string', enum: Object.values(TaskType), example: TaskType.PLANNED },
    scheduledFor: { type: 'string', format: 'date-time', nullable: true, example: '2026-05-08T09:00:00.000Z' },
    estimatedEndDate: { type: 'string', format: 'date-time', nullable: true, example: null },
    startDate: { type: 'string', format: 'date-time', nullable: true, example: null },
    estimatedDuration: { type: 'integer', example: 3600000, description: 'milliseconds' },
    actualDuration: { type: 'integer', nullable: true, example: null, description: 'milliseconds' },
    analytics: {
      type: 'object',
      properties: {
        efficiencyScore: { type: 'number', nullable: true, example: null, description: '>100 faster than estimated, <100 over-run' },
      },
    },
    completedAt: { type: 'string', format: 'date-time', nullable: true, example: null },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const DailyTaskSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'tsk_abc123' },
    title: { type: 'string', example: 'Write unit tests' },
    status: { type: 'string', enum: Object.values(TaskStatus), example: TaskStatus.PENDING },
    priority: { type: 'string', enum: Object.values(TaskPriority), example: TaskPriority.HIGH },
    type: { type: 'string', enum: Object.values(TaskType), example: TaskType.PLANNED },
    scheduledFor: { type: 'string', format: 'date-time', nullable: true },
    estimatedDuration: { type: 'integer', example: 3600000, description: 'milliseconds' },
    actualDuration: { type: 'integer', nullable: true, example: null, description: 'milliseconds' },
    completedAt: { type: 'string', format: 'date-time', nullable: true },
    goal: {
      type: 'object',
      properties: {
        id: { type: 'string', nullable: true, example: null },
        title: { type: 'string', nullable: true, example: null },
      },
    },
    analytics: {
      type: 'object',
      properties: {
        efficiencyScore: { type: 'number', nullable: true, example: null, description: '>100 faster than estimated, <100 over-run' },
      },
    },
  },
};

const TaskStatsSchema = {
  type: 'object',
  properties: {
    total: { type: 'integer', example: 50 },
    byStatus: {
      type: 'object',
      properties: Object.fromEntries(
        Object.values(TaskStatus).map((s) => [s, { type: 'integer', example: 0 }]),
      ),
    },
    byType: {
      type: 'object',
      properties: Object.fromEntries(
        Object.values(TaskType).map((t) => [t, { type: 'integer', example: 0 }]),
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

interface TaskResponse {
  id: string;
  userId: string;
  goal: { id: string | null; title: string | null };
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  scheduledFor: Date | null;
  estimatedEndDate: Date | null;
  startDate: Date | null;
  estimatedDuration: number;
  actualDuration: number | null;
  analytics: { efficiencyScore: number | null };
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toTaskResponse(task: Task, goalTitle: string | null): TaskResponse {
  return {
    id: task.id,
    userId: task.userId,
    goal: { id: task.goalId, title: goalTitle },
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    scheduledFor: task.scheduledFor,
    estimatedEndDate: task.estimatedEndDate,
    startDate: task.startDate,
    estimatedDuration: task.estimatedDuration,
    actualDuration: task.actualDuration,
    analytics: { efficiencyScore: task.efficiencyScore },
    completedAt: task.completedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

@ApiTags('Tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly createTaskService: CreateTaskService,
    private readonly updateTaskService: UpdateTaskService,
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
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'estimatedDuration'],
      properties: {
        title: { type: 'string', maxLength: 200, example: 'Write unit tests for auth module' },
        description: { type: 'string', maxLength: 1000, nullable: true, example: null },
        priority: { type: 'string', enum: Object.values(TaskPriority), example: TaskPriority.HIGH, description: 'Defaults to MEDIUM if omitted' },
        type: { type: 'string', enum: Object.values(TaskType), example: TaskType.PLANNED, description: 'Auto-derived if omitted — PLANNED when goalId or scheduledFor present' },
        scheduledFor: { type: 'string', example: '2026-05-08T09:00:00.000Z', description: 'YYYY-MM-DD or ISO 8601 — the date the user plans to work on this' },
        estimatedDuration: { type: 'integer', minimum: 1, maximum: 86400000, example: 3600000, description: 'Time-box in milliseconds — required; max 24 h (86 400 000 ms)' },
        estimatedEndDate: { type: 'string', example: null, description: 'YYYY-MM-DD or ISO 8601 — optional target completion date' },
        goalId: { type: 'string', example: null, description: 'Link to an existing goal; triggers PLANNED type if omitted' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Task created.', schema: ApiSuccessSchema(TaskResponseSchema) })
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
  @ApiQuery({ name: 'date', required: true, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, example: '2026-05-08', description: 'YYYY-MM-DD' })
  @ApiResponse({ status: 200, description: 'Tasks returned.', schema: ApiSuccessSchema({ type: 'array', items: DailyTaskSummarySchema }) })
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
      'Returns all non-deleted tasks for the authenticated user, paginated. ' +
      'Date filtering via startDate/endDate: ' +
      'no dates → all tasks; ' +
      'startDate only → that single day; ' +
      'startDate + endDate → inclusive range; ' +
      'startDate + endDate="Infinity" → from startDate with no upper bound. ' +
      'For planned tasks the date is matched against scheduledFor; ' +
      'for unplanned tasks (no scheduledFor) it falls back to createdAt.',
  })
  @ApiQuery({ name: 'type', required: false, enum: TaskType, description: 'Filter by task type' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus, description: 'Filter by task status (combinable with type)' })
  @ApiQuery({ name: 'goalId', required: false, schema: { type: 'string' }, description: 'Filter by linked goal ID' })
  @ApiQuery({ name: 'startDate', required: false, schema: { type: 'string' }, example: '2026-05-08', description: 'YYYY-MM-DD — alone: single day; with endDate: start of range' })
  @ApiQuery({ name: 'endDate', required: false, schema: { type: 'string' }, example: '2026-05-17', description: 'YYYY-MM-DD or "Infinity" — end of range; Infinity means no upper bound' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', minimum: 1, default: 1 }, example: 1 })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT }, example: DEFAULT_LIMIT })
  @ApiResponse({ status: 200, description: 'Tasks returned.', schema: ApiSuccessSchema(PaginatedSchema(TaskResponseSchema)) })
  async list(
    @Req() req: Request,
    @Query('type') type?: TaskType,
    @Query('status') status?: TaskStatus,
    @Query('goalId') goalId?: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseType<PaginatedResponse<TaskResponse>>> {
    const { sub: userId } = req.user as TokenPayload;
    const pagination = parsePagination(page, limit);

    let dateFrom: Date | undefined;
    let dateTo: Date | null | undefined;

    if (startDateStr) {
      const parsed = new Date(startDateStr);
      if (isNaN(parsed.getTime())) {
        throw new BadRequestException("'startDate' must be in YYYY-MM-DD format.");
      }
      dateFrom = parsed;

      if (endDateStr !== undefined) {
        if (endDateStr === 'Infinity') {
          dateTo = null; // open-ended
        } else {
          const parsedEnd = new Date(endDateStr);
          if (isNaN(parsedEnd.getTime())) {
            throw new BadRequestException("'endDate' must be YYYY-MM-DD or 'Infinity'.");
          }
          dateTo = parsedEnd;
        }
      }
      // endDate not provided → dateTo stays undefined → single day
    }

    const { items, total, goalTitles } = await this.getTasksService.getByFilter(
      userId,
      { type, status, goalId, dateFrom, dateTo },
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
  @ApiResponse({ status: 200, description: 'Stats returned.', schema: ApiSuccessSchema(TaskStatsSchema) })
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
  @ApiQuery({ name: 'q', required: true, schema: { type: 'string', minLength: 1 }, description: 'Case-insensitive substring match on title and description', example: 'unit tests' })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', minimum: 1, default: 1 }, example: 1 })
  @ApiQuery({ name: 'limit', required: false, schema: { type: 'integer', minimum: 1, maximum: MAX_LIMIT, default: DEFAULT_LIMIT }, example: DEFAULT_LIMIT })
  @ApiResponse({ status: 200, description: 'Search results returned.', schema: ApiSuccessSchema(PaginatedSchema(TaskResponseSchema)) })
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
  @ApiResponse({ status: 200, description: 'Task returned.', schema: ApiSuccessSchema(TaskResponseSchema) })
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

  // ─── Update ──────────────────────────────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a task',
    description:
      'Partial update. Status machine: PENDING→IN_PROGRESS|CANCELLED, ' +
      'IN_PROGRESS→PENDING|COMPLETED|CANCELLED, ' +
      'COMPLETED→PENDING. ' +
      'When setting status to COMPLETED, efficiencyScore is computed from actualDuration ' +
      '(falls back to session-backfilled value, then estimatedDuration).',
  })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiBody({
    description: 'All fields optional. At least one must be present.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 200, example: 'Write integration tests' },
        description: { type: 'string', maxLength: 1000, nullable: true, example: null },
        priority: { type: 'string', enum: Object.values(TaskPriority), example: TaskPriority.MEDIUM },
        status: { type: 'string', enum: Object.values(TaskStatus), example: 'IN_PROGRESS', description: 'See state machine in description.' },
        scheduledFor: { type: 'string', nullable: true, example: '2026-05-09', description: 'YYYY-MM-DD or ISO 8601; null to clear' },
        estimatedEndDate: { type: 'string', nullable: true, example: null, description: 'YYYY-MM-DD or ISO 8601; null to clear' },
        startDate: { type: 'string', nullable: true, example: null, description: 'YYYY-MM-DD or ISO 8601; null to clear' },
        completedAt: { type: 'string', example: '2026-05-18T14:30:00.000Z', description: 'ISO 8601 — required when status is COMPLETED' },
        estimatedDuration: { type: 'integer', minimum: 1, maximum: 86400000, example: 5400000, description: 'milliseconds; max 24 h' },
        actualDuration: { type: 'integer', minimum: 1, example: 3400000, description: 'milliseconds — used when completing a task to compute efficiencyScore' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Task updated.', schema: ApiSuccessSchema(TaskResponseSchema) })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTaskSchema)) dto: UpdateTaskDto,
  ): Promise<ApiResponseType<TaskResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const task = await this.updateTaskService.execute(id, userId, dto as UpdateTaskInput);
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
  @ApiResponse({ status: 200, description: 'Task deleted.', schema: ApiSuccessSchema() })
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
