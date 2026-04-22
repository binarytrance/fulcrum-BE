export const GOAL_TITLE_PORT = Symbol('GOAL_TITLE_PORT');

export interface IGoalTitleLookup {
  /**
   * Batch-fetch goal titles by IDs.
   * Returns a Map of goalId → title for every found goal.
   * Unknown IDs are simply absent from the map.
   */
  fetchTitles(goalIds: string[]): Promise<Map<string, string>>;
}
