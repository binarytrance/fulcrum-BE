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
  type ApiResponse as ApiResponseType,
} from '@shared/presentation/responses/api-response';
import { Task } from '@tasks/domain/entities/task.entity';
import {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '@tasks/domain/types/task.types';

interface TaskResponse {
  id: string;
  userId: string;
  goalId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  scheduledFor: Date | null;
  estimatedDuration: number;
  actualDuration: number | null;
  efficiencyScore: number | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    userId: task.userId,
    goalId: task.goalId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    scheduledFor: task.scheduledFor,
    estimatedDuration: task.estimatedDuration,
    actualDuration: task.actualDuration,
    efficiencyScore: task.efficiencyScore,
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
  @ApiResponse({ status: 201, description: 'Task created.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 404, description: 'Goal not found.' })
  async create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(CreateTaskSchema)) dto: CreateTaskDto,
  ): Promise<ApiResponseType<TaskResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const task = await this.createTaskService.execute({ userId, ...dto });
    return ok('Task created successfully.', toTaskResponse(task));
  }

  // ─── Daily planner query ────────────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get tasks for a specific date (daily planner)',
    description:
      'Returns all tasks scheduled for the given date. ' +
      'Returns a trimmed DTO (no description/timestamps) — this is the hot-path endpoint. ' +
      'Results are Redis-cached with a 60 s TTL.',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Calendar date in YYYY-MM-DD format (daily planner)',
    example: '2026-02-27',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: TaskType,
    description: 'Filter by task type — returns all matching non-deleted tasks',
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
    description: 'Filter by goal ID (combinable with type/status)',
  })
  @ApiResponse({ status: 200, description: 'Tasks returned.' })
  @ApiResponse({ status: 400, description: 'Invalid or missing query params.' })
  async getByDate(
    @Req() req: Request,
    @Query('date') dateStr?: string,
    @Query('type') type?: TaskType,
    @Query('status') status?: TaskStatus,
    @Query('goalId') goalId?: string,
  ): Promise<ApiResponseType<DailyTaskSummary[] | TaskResponse[]>> {
    const { sub: userId } = req.user as TokenPayload;

    // ── Daily planner path (hot, cached, trimmed DTO) ──────────────────────────
    if (dateStr) {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
      }
      const summaries = await this.getTasksService.getByDate(userId, date);
      return ok('Tasks retrieved successfully.', summaries);
    }

    // ── Filter path (type / status / goalId) ───────────────────────────────────
    if (type || status || goalId) {
      const tasks = await this.getTasksService.getByFilter(userId, {
        type,
        status,
        goalId,
      });
      return ok('Tasks retrieved successfully.', tasks.map(toTaskResponse));
    }

    throw new BadRequestException(
      'Provide at least one query param: date, type, status, or goalId.',
    );
  }

  // ─── Get one ─────────────────────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single task by ID (full detail)' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task returned.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  async getOne(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponseType<TaskResponse>> {
    const { sub: userId } = req.user as TokenPayload;
    const task = await this.getTasksService.getOne(id, userId);
    return ok('Task retrieved successfully.', toTaskResponse(task));
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
  @ApiResponse({ status: 200, description: 'Task completed.' })
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
    return ok('Task completed successfully.', toTaskResponse(task));
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
  @ApiResponse({ status: 200, description: 'Task updated.' })
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
    return ok('Task updated successfully.', toTaskResponse(task));
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
  @ApiResponse({ status: 200, description: 'Task deleted.' })
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
