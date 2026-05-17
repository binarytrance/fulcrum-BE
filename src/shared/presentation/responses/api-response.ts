export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

export function ok<T>(message: string, data?: T): ApiResponse<T> {
  return { success: true, message, ...(data !== undefined && { data }) };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const ApiSuccessSchema = (dataSchema?: object) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    ...(dataSchema ? { data: dataSchema } : {}),
  },
});

export function paginated<T>(
  message: string,
  items: T[],
  total: number,
  page: number,
  limit: number,
): ApiResponse<PaginatedResponse<T>> {
  return ok(message, {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
