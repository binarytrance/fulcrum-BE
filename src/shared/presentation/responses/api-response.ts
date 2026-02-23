export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

export function ok<T>(message: string, data?: T): ApiResponse<T> {
  return { success: true, message, ...(data !== undefined && { data }) };
}
