import { BadRequestException } from '@nestjs/common';
import {
  TaskFields,
  TaskStatus,
  TASK_STATUS_TRANSITIONS,
} from '@tasks/domain/types/task.types';

export class Task {
  private readonly _id: TaskFields['id'];
  private readonly _userId: TaskFields['userId'];
  private readonly _goalId: TaskFields['goalId'];
  private readonly _title: TaskFields['title'];
  private readonly _description: TaskFields['description'];
  private readonly _status: TaskFields['status'];
  private readonly _priority: TaskFields['priority'];
  private readonly _type: TaskFields['type'];
  private readonly _scheduledFor: TaskFields['scheduledFor'];
  private readonly _estimatedDuration: TaskFields['estimatedDuration'];
  private readonly _actualDuration: TaskFields['actualDuration'];
  private readonly _efficiencyScore: TaskFields['efficiencyScore'];
  private readonly _completedAt: TaskFields['completedAt'];
  private readonly _deletedAt: TaskFields['deletedAt'];
  private readonly _habitId: string | null;
  private readonly _createdAt: TaskFields['createdAt'];
  private readonly _updatedAt: TaskFields['updatedAt'];

  constructor(fields: TaskFields) {
    this._id = fields.id;
    this._userId = fields.userId;
    this._goalId = fields.goalId;
    this._title = fields.title;
    this._description = fields.description;
    this._status = fields.status;
    this._priority = fields.priority;
    this._type = fields.type;
    this._scheduledFor = fields.scheduledFor;
    this._estimatedDuration = fields.estimatedDuration;
    this._actualDuration = fields.actualDuration;
    this._efficiencyScore = fields.efficiencyScore;
    this._completedAt = fields.completedAt;
    this._deletedAt = fields.deletedAt;
    this._habitId = fields.habitId ?? null;
    this._createdAt = fields.createdAt;
    this._updatedAt = fields.updatedAt;
  }

  get id() {
    return this._id;
  }
  get userId() {
    return this._userId;
  }
  get goalId() {
    return this._goalId;
  }
  get title() {
    return this._title;
  }
  get description() {
    return this._description;
  }
  get status() {
    return this._status;
  }
  get priority() {
    return this._priority;
  }
  get type() {
    return this._type;
  }
  get scheduledFor() {
    return this._scheduledFor;
  }
  get estimatedDuration() {
    return this._estimatedDuration;
  }
  get actualDuration() {
    return this._actualDuration;
  }
  get efficiencyScore() {
    return this._efficiencyScore;
  }
  get completedAt() {
    return this._completedAt;
  }
  get deletedAt() {
    return this._deletedAt;
  }
  get habitId() {
    return this._habitId;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }

  toFields(): TaskFields {
    return {
      id: this._id,
      userId: this._userId,
      goalId: this._goalId,
      title: this._title,
      description: this._description,
      status: this._status,
      priority: this._priority,
      type: this._type,
      scheduledFor: this._scheduledFor,
      estimatedDuration: this._estimatedDuration,
      actualDuration: this._actualDuration,
      efficiencyScore: this._efficiencyScore,
      completedAt: this._completedAt,
      deletedAt: this._deletedAt,
      habitId: this._habitId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  /**
   * Partial update — enforces the status state machine.
   * Transitioning to COMPLETED is blocked here; use task.complete() instead.
   */
  update(
    fields: Partial<
      Pick<
        TaskFields,
        | 'title'
        | 'description'
        | 'priority'
        | 'scheduledFor'
        | 'estimatedDuration'
        | 'status'
      >
    >,
  ): Task {
    if (fields.status !== undefined && fields.status !== this._status) {
      if (fields.status === TaskStatus.COMPLETED) {
        throw new BadRequestException(
          'Use the /complete endpoint to complete a task.',
        );
      }
      const allowed = TASK_STATUS_TRANSITIONS[this._status];
      if (!allowed.includes(fields.status)) {
        throw new BadRequestException(
          `Cannot transition task from ${this._status} to ${fields.status}.`,
        );
      }
    }
    return new Task({ ...this.toFields(), ...fields, updatedAt: new Date() });
  }

  /**
   * Marks the task as completed.
   * Computes efficiencyScore = round((estimatedDuration / actualDuration) * 100).
   * A score > 100 means the user finished faster than estimated.
   */
  complete(actualDuration: number): Task {
    const allowed = TASK_STATUS_TRANSITIONS[this._status];
    if (!allowed.includes(TaskStatus.COMPLETED)) {
      throw new BadRequestException(
        `Cannot complete a task with status ${this._status}.`,
      );
    }
    const efficiencyScore = Math.round(
      (this._estimatedDuration / actualDuration) * 100,
    );
    const now = new Date();
    return new Task({
      ...this.toFields(),
      status: TaskStatus.COMPLETED,
      actualDuration,
      efficiencyScore,
      completedAt: now,
      updatedAt: now,
    });
  }

  softDelete(): Task {
    return new Task({
      ...this.toFields(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static create(
    fields: Omit<
      TaskFields,
      | 'createdAt'
      | 'updatedAt'
      | 'actualDuration'
      | 'efficiencyScore'
      | 'completedAt'
      | 'deletedAt'
    >,
  ): Task {
    const now = new Date();
    return new Task({
      ...fields,
      actualDuration: null,
      efficiencyScore: null,
      completedAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}
