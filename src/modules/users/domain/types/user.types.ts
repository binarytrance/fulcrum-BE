export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export interface AppStreak {
  current: number;
  longest: number;
  /** YYYY-MM-DD of the last day any activity was recorded */
  lastActiveDate: string | null;
}

export const DEFAULT_APP_STREAK: AppStreak = {
  current: 0,
  longest: 0,
  lastActiveDate: null,
};

export interface UserFields {
  id: string;
  firstname: string;
  lastname: string | null;
  email: string;
  status: UserStatus;
  appStreak: AppStreak;
  createdAt: Date;
  updatedAt: Date;
}
