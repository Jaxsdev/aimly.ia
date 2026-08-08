import { z } from 'zod';

export const createCardSchema = z.object({
  text: z.string().min(1).max(500),
  type: z.literal('idea'),
  x: z.number(),
  y: z.number()
});

export const updateCardSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  groupId: z.string().nullable().optional()
});

export const moveCardSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const groupCardsSchema = z.object({
  title: z.string().min(1).max(100),
  cardIds: z.array(z.string())
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
export type GroupCardsInput = z.infer<typeof groupCardsSchema>;
