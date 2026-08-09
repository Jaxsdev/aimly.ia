import Anthropic from '@anthropic-ai/sdk';

// Centralized model selection — only place to change the model
export const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY is not set. Claude features will not work.');
}

export const anthropic = new (Anthropic as any)({
  apiKey: process.env.ANTHROPIC_API_KEY
});
