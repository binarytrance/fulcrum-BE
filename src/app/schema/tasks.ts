import z from 'zod';

export const tasksParamsSchema = z.object({
  goalId: z.string().uuid('goalId is not of type uuid'),
});

export type TasksParams = z.infer<typeof tasksParamsSchema>;
