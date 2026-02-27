import { z } from 'zod';

export const StartSessionSchema = z.object({
  taskId: z.string().min(1),
});
export type StartSessionDto = z.infer<typeof StartSessionSchema>;

export const HeartbeatSchema = z.object({
  sessionId: z.string().min(1),
});
export type HeartbeatDto = z.infer<typeof HeartbeatSchema>;

export const LogDistractionSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().min(1).max(500),
  estimatedMinutes: z
    .number({ error: 'estimatedMinutes must be a number' })
    .int()
    .min(1)
    .max(120),
});
export type LogDistractionDto = z.infer<typeof LogDistractionSchema>;

export const StopSessionSchema = z.object({
  sessionId: z.string().min(1),
});
export type StopSessionDto = z.infer<typeof StopSessionSchema>;
