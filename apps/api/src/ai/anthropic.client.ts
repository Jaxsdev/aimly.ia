import Anthropic from '@anthropic-ai/sdk';

// Centralized model selection — only place to change the model
export const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY is not set. Claude features will not work.');
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
