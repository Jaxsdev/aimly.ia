import { z } from 'zod';

export const createVoteSchema = z.object({
  question: z.string().min(1).max(250),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
  criteria: z.array(z.string()).optional()
});

export const castVoteSchema = z.object({
  optionId: z.string()
});

export type CreateVoteInput = z.infer<typeof createVoteSchema>;
export type CastVoteInput = z.infer<typeof castVoteSchema>;
