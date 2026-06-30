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
  estimated: z
    .number({ error: 'estimated must be a number' })
    .int()
    .min(1_000)
    .max(120 * 60 * 1_000),
});
export type LogDistractionDto = z.infer<typeof LogDistractionSchema>;

export const StopSessionSchema = z.object({
  sessionId: z.string().min(1),
});
export type StopSessionDto = z.infer<typeof StopSessionSchema>;

export const ExtendTrackingSchema = z.object({
  sessionId: z.string().min(1),
  additional: z
    .number({ error: 'additional must be a number' })
    .int()
    .min(60_000)
    .max(4 * 60 * 60 * 1_000),
});
export type ExtendTrackingDto = z.infer<typeof ExtendTrackingSchema>;
