export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export enum SessionSource {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

export enum PlantStatus {
  HEALTHY = 'HEALTHY',
  WILTING = 'WILTING',
  WILTED = 'WILTED',
}

/** Distraction count threshold before plant starts wilting */
export const WILTING_DISTRACTION_COUNT = 1;
/** Distraction count threshold for fully wilted */
export const WILTED_DISTRACTION_COUNT = 3;
/** Cumulative distraction milliseconds before wilting */
export const WILTING_DISTRACTION_MS = 15 * 60 * 1000;
/** Cumulative distraction milliseconds for fully wilted */
export const WILTED_DISTRACTION_MS = 30 * 60 * 1000;

/** Sessions with no heartbeat beyond this are auto-abandoned */
export const SESSION_ABANDONMENT_MS = 4 * 60 * 60 * 1000; // 4 hours

export enum SessionSortBy {
  STARTED_AT = 'startedAt',
  DURATION_MS = 'durationMs',
  NET_FOCUS_MS = 'netFocusMs',
  PLANT_GROWTH_PERCENT = 'plantGrowthPercent',
}
