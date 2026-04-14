import { BadRequestException } from '@nestjs/common';
import {
  GoalFields,
  GoalProgress,
  GoalStatus,
  GoalCategory,
  GoalPriority,
  GOAL_STATUS_TRANSITIONS,
  INITIAL_PROGRESS,
} from '@goals/domain/types/goal.types';

export class Goal {
  private readonly _id: GoalFields['id'];
  private readonly _userId: GoalFields['userId'];
  private readonly _parentGoalId: GoalFields['parentGoalId'];
  private readonly _title: GoalFields['title'];
  private readonly _description: GoalFields['description'];
  private readonly _category: GoalFields['category'];
  private readonly _status: GoalFields['status'];
  private readonly _priority: GoalFields['priority'];
  private readonly _estimatedEndDate: GoalFields['estimatedEndDate'];
  private readonly _estimatedDuration: GoalFields['estimatedDuration'];
  private readonly _estimatedStartDate: GoalFields['estimatedStartDate'];
  private readonly _actualStartDate: GoalFields['actualStartDate'];
  private readonly _actualEndDate: GoalFields['actualEndDate'];
  private readonly _level: GoalFields['level'];
  private readonly _progress: GoalFields['progress'];
  private readonly _deletedAt: GoalFields['deletedAt'];
  private readonly _createdAt: GoalFields['createdAt'];
  private readonly _updatedAt: GoalFields['updatedAt'];

  constructor(fields: GoalFields) {
    this._id = fields.id;
    this._userId = fields.userId;
    this._parentGoalId = fields.parentGoalId;
    this._title = fields.title;
    this._description = fields.description;
    this._category = fields.category;
    this._status = fields.status;
    this._priority = fields.priority;
    this._estimatedEndDate = fields.estimatedEndDate;
    this._estimatedDuration = fields.estimatedDuration;
    this._estimatedStartDate = fields.estimatedStartDate;
    this._actualStartDate = fields.actualStartDate;
    this._actualEndDate = fields.actualEndDate;
    this._level = fields.level;
    this._progress = fields.progress;
    this._deletedAt = fields.deletedAt;
    this._createdAt = fields.createdAt;
    this._updatedAt = fields.updatedAt;
  }

  get id() {
    return this._id;
  }

  get userId() {
    return this._userId;
  }

  get parentGoalId() {
    return this._parentGoalId;
  }

  get title() {
    return this._title;
  }

  get description() {
    return this._description;
  }

  get category() {
    return this._category;
  }

  get status() {
    return this._status;
  }

  get priority() {
    return this._priority;
  }

  get estimatedEndDate() {
    return this._estimatedEndDate;
  }

  get estimatedDuration() {
    return this._estimatedDuration;
  }

  get estimatedStartDate() {
    return this._estimatedStartDate;
  }

  get actualStartDate() {
    return this._actualStartDate;
  }

  get actualEndDate() {
    return this._actualEndDate;
  }

  get level() {
    return this._level;
  }

  get progress() {
    return this._progress;
  }

  get deletedAt() {
    return this._deletedAt;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  /**
   * Returns a new Goal with the given scalar fields changed.
   * Status transitions are validated here — the domain enforces the state machine.
   * Auto-sets actualStartDate when transitioning to ACTIVE (if not already set).
   * Auto-sets actualEndDate when transitioning to COMPLETED or ABANDONED (if not already set).
   */
  update(
    fields: Partial<
      Pick<
        GoalFields,
        | 'title'
        | 'description'
        | 'category'
        | 'status'
        | 'priority'
        | 'estimatedEndDate'
        | 'estimatedDuration'
        | 'estimatedStartDate'
        | 'actualStartDate'
        | 'actualEndDate'
      >
    >,
  ): Goal {
    if (fields.status !== undefined && fields.status !== this._status) {
      const allowed = GOAL_STATUS_TRANSITIONS[this._status];
      if (!allowed.includes(fields.status)) {
        throw new BadRequestException(
          `Cannot transition goal from '${this._status}' to '${fields.status}'. ` +
            `Allowed transitions: ${allowed.join(', ') || 'none'}.`,
        );
      }
    }

    const merged: GoalFields = {
      ...this.toFields(),
      ...fields,
      updatedAt: new Date(),
    };

    // Auto-set actualStartDate when transitioning to ACTIVE
    if (
      fields.status === GoalStatus.ACTIVE &&
      merged.actualStartDate === null
    ) {
      merged.actualStartDate = new Date();
    }

    // Auto-set actualEndDate when transitioning to COMPLETED or ABANDONED
    if (
      (fields.status === GoalStatus.COMPLETED ||
        fields.status === GoalStatus.ABANDONED) &&
      merged.actualEndDate === null
    ) {
      merged.actualEndDate = new Date();
    }

    return new Goal(merged);
  }

  /** Replace the stored progress snapshot (called by background worker). */
  withProgress(progress: GoalProgress): Goal {
    return new Goal({ ...this.toFields(), progress, updatedAt: new Date() });
  }

  /** Soft-delete: sets deletedAt, never removes the document. */
  softDelete(): Goal {
    return new Goal({
      ...this.toFields(),
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  get isDeleted(): boolean {
    return this._deletedAt !== null;
  }

  toFields(): GoalFields {
    return {
      id: this._id,
      userId: this._userId,
      parentGoalId: this._parentGoalId,
      title: this._title,
      description: this._description,
      category: this._category,
      status: this._status,
      priority: this._priority,
      estimatedEndDate: this._estimatedEndDate,
      estimatedDuration: this._estimatedDuration,
      estimatedStartDate: this._estimatedStartDate,
      actualStartDate: this._actualStartDate,
      actualEndDate: this._actualEndDate,
      level: this._level,
      progress: this._progress,
      deletedAt: this._deletedAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static create(
    fields: Omit<
      GoalFields,
      'createdAt' | 'updatedAt' | 'progress' | 'deletedAt'
    >,
  ): Goal {
    const now = new Date();
    return new Goal({
      ...fields,
      progress: { ...INITIAL_PROGRESS, lastComputedAt: now },
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// Re-export enums for convenience
export { GoalStatus, GoalCategory, GoalPriority };
