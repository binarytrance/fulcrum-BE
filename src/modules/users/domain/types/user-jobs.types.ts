export const USERS_QUEUE_NAME = 'users';

export enum UserJobName {
  UPDATE_APP_STREAK = 'UPDATE_APP_STREAK',
}

export interface UserJobPayloads {
  [UserJobName.UPDATE_APP_STREAK]: {
    userId: string;
    date: string; // YYYY-MM-DD
  };
}
