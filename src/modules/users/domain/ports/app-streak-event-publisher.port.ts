export const APP_STREAK_EVENT_PUBLISHER_PORT = Symbol('APP_STREAK_EVENT_PUBLISHER_PORT');

export interface IAppStreakEventPublisher {
  publishActivityRecorded(userId: string, date: string): Promise<void>;
}
