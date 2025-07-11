import z from 'zod';

export const goalsParamsSchema = z.object({
  userId: z.string().uuid('userId is not of type uuid'),
});

export type GoalsParams = z.infer<typeof goalsParamsSchema>;
