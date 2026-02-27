export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export enum SessionSource {
  TIMER = 'TIMER',
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
/** Cumulative distraction minutes before wilting */
export const WILTING_DISTRACTION_MINUTES = 15;
/** Cumulative distraction minutes for fully wilted */
export const WILTED_DISTRACTION_MINUTES = 30;

/** Sessions with no heartbeat beyond this are auto-abandoned */
export const SESSION_ABANDONMENT_MS = 4 * 60 * 60 * 1000; // 4 hours
