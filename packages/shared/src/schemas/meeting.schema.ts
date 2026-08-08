import { z } from 'zod';

export const createMeetingSchema = z.object({
  title: z.string().min(1).max(120),
  objective: z.string().min(1).max(500),
  expectedOutcome: z.string().min(1).max(500),
  durationMinutes: z.number().int().min(5).max(180)
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
