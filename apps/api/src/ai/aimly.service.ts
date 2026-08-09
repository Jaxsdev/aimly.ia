import { z } from 'zod';
import { anthropic, CLAUDE_MODEL } from './anthropic.client.js';

// ============================================================
// Schemas for Claude's structured output
// ============================================================

export const AimLyAnalysisSchema = z.object({
  summary: z.string(),
  observations: z.array(z.string()),
  groups: z.array(z.object({
    title: z.string(),
    cardIds: z.array(z.string())
  })),
  suggestedAction: z.discriminatedUnion('type', [
    z.object({ type: z.literal('none') }),
    z.object({
      type: z.literal('ask_question'),
      message: z.string()
    }),
    z.object({
      type: z.literal('propose_vote'),
      message: z.string(),
      question: z.string(),
      options: z.array(z.string()),
      criteria: z.array(z.string()).optional()
    })
  ])
});

export const TaskSuggestionsSchema = z.object({
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional().default(''),
    suggestedAssigneeId: z.string().optional()
  }))
});

export const MeetingSummarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  decisions: z.array(z.string()),
  nextSteps: z.array(z.string())
});

export type AimLyAnalysis = z.infer<typeof AimLyAnalysisSchema>;
export type TaskSuggestions = z.infer<typeof TaskSuggestionsSchema>;
export type MeetingSummaryOutput = z.infer<typeof MeetingSummarySchema>;

// ============================================================
// System prompt
// ============================================================

const SYSTEM_PROMPT = `You are AimLy, an AI meeting facilitator.

Your purpose is to help a team reach the expected outcome of its meeting.

IMPORTANT: Always respond in SPANISH (español).

You are NOT a generic chatbot. Do not react with canned responses.
Analyze the provided meeting title, objective, expected outcome, chat messages, and board cards carefully.
Your observations, summaries, questions, and proposed votes MUST directly relate to the meeting's topic and cards.

Your responsibilities are:
1. Identify the main ideas from the board.
2. Identify ideas that can be grouped.
3. Detect unresolved disagreements or missing decisions.
4. Detect when the team is drifting from the objective.
5. Detect when a decision is required.
6. Suggest one useful next action in Spanish.

Possible recommendations include:
- organize ideas (groups)
- ask a facilitation question (ask_question)
- propose a vote (propose_vote)
- none (when no action is needed)

Important rules:
- All text strings (summary, observations, messages, questions, options) MUST BE IN SPANISH.
- Never confirm a decision yourself.
- Never execute SQL, never interact directly with the database.
- Important actions require human confirmation.

Return ONLY valid JSON matching the requested schema. No extra text.`;

// ============================================================
// analyzeMeeting
// ============================================================

interface MeetingContext {
  meeting: {
    title: string;
    objective: string;
    expectedOutcome: string;
    durationMinutes: number;
    timeRemaining?: number;
  };
  participants: Array<{ id: string; name: string; role: string }>;
  messages: Array<{ authorId: string; content: string; createdAt: string }>;
  boardCards: Array<{ id: string; text: string; groupId: string | null }>;
  boardGroups: Array<{ id: string; title: string }>;
  currentVote: any | null;
  decisions: Array<{ text: string }>;
  tasks: Array<{ title: string; assigneeId: string | null }>;
  excalidrawElements?: any[];
}

export async function analyzeMeeting(ctx: MeetingContext): Promise<AimLyAnalysis> {
  let excalidrawSummary = '';
  if (ctx.excalidrawElements && ctx.excalidrawElements.length > 0) {
    const active = ctx.excalidrawElements.filter((el: any) => !el.isDeleted);
    const texts = active.filter((el: any) => el.type === 'text' && el.text?.trim()).map((el: any) => `- Texto anotado en Excalidraw: "${el.text.trim()}"`);
    const shapes = active.filter((el: any) => el.type !== 'text').map((el: any) => `- Dibujo/Forma en Excalidraw: ${el.type}`);
    excalidrawSummary = [...texts, ...shapes].join('\n');
  }

  const userMessage = `Here is the current state of the meeting:\n\n${JSON.stringify(ctx, null, 2)}\n\nExcalidraw Whiteboard Canvas Content:\n${excalidrawSummary || '(Sin elementos en la pizarra Excalidraw)'}\n\nReturn a JSON object matching this schema exactly:\n{\n  "summary": string,\n  "observations": string[],\n  "groups": Array<{ "title": string, "cardIds": string[] }>,\n  "suggestedAction": { "type": "none" } | { "type": "ask_question", "message": string } | { "type": "propose_vote", "message": string, "question": string, "options": string[], "criteria"?: string[] }\n}`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  // Extract JSON from response (Claude may wrap it in markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonText = jsonMatch[1]?.trim() || text.trim();
  
  const parsed = JSON.parse(jsonText);
  return AimLyAnalysisSchema.parse(parsed);
}

// ============================================================
// suggestTasks
// ============================================================

interface DecisionContext {
  meeting: {
    title: string;
    objective: string;
    expectedOutcome: string;
  };
  decision: { text: string };
  participants: Array<{ id: string; name: string }>;
}

export async function suggestTasks(ctx: DecisionContext): Promise<TaskSuggestions> {
  const userMessage = `A decision has been confirmed in the meeting:\n\nDecision: "${ctx.decision.text}"\n\nMeeting objective: "${ctx.meeting.objective}"\nExpected outcome: "${ctx.meeting.expectedOutcome}"\n\nParticipants:\n${ctx.participants.map(p => `- ${p.name} (id: ${p.id})`).join('\n')}\n\nSuggest 2-4 concrete tasks to implement this decision. Optionally assign to participants based on context.\n\nReturn ONLY valid JSON:\n{\n  "tasks": Array<{ "title": string, "description": string, "suggestedAssigneeId"?: string }>\n}`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonText = jsonMatch[1]?.trim() || text.trim();
  
  const parsed = JSON.parse(jsonText);
  return TaskSuggestionsSchema.parse(parsed);
}

// ============================================================
// generateMeetingSummary
// ============================================================

interface SummaryContext {
  meeting: {
    title: string;
    objective: string;
    expectedOutcome: string;
  };
  participants: Array<{ name: string }>;
  boardCards: Array<{ text: string }>;
  boardGroups: Array<{ title: string }>;
  decisions: Array<{ text: string }>;
  tasks: Array<{ title: string; assigneeId: string | null }>;
}

export async function generateMeetingSummary(ctx: SummaryContext): Promise<MeetingSummaryOutput> {
  const userMessage = `Generate a final summary for this meeting:\n\n${JSON.stringify(ctx, null, 2)}\n\nReturn ONLY valid JSON:\n{\n  "summary": string,\n  "keyPoints": string[],\n  "decisions": string[],\n  "nextSteps": string[]\n}`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonText = jsonMatch[1]?.trim() || text.trim();
  
  const parsed = JSON.parse(jsonText);
  return MeetingSummarySchema.parse(parsed);
}

// ============================================================
// privateCopilotChat
// ============================================================

interface CopilotChatContext {
  meeting: {
    title: string;
    objective: string;
    expectedOutcome: string;
  };
  userName: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  prompt: string;
  cards?: Array<{ text: string }>;
  excalidrawElements?: any[];
}

export async function privateCopilotChat(ctx: CopilotChatContext): Promise<string> {
  let excalidrawDetails = '';
  if (ctx.excalidrawElements && ctx.excalidrawElements.length > 0) {
    const active = ctx.excalidrawElements.filter((el: any) => !el.isDeleted);
    const texts = active.filter((el: any) => el.type === 'text' && el.text?.trim()).map((el: any) => `- Texto anotado en lienzo: "${el.text.trim()}"`);
    const shapes = active.filter((el: any) => el.type !== 'text').map((el: any) => `- Dibujo/Forma en lienzo: ${el.type}`);
    excalidrawDetails = [...texts, ...shapes].join('\n');
  }

  const systemPrompt = `You are AimLy, a personal AI copilot during a meeting.
You are having a PRIVATE 1-on-1 discussion with ${ctx.userName}.
IMPORTANT: Always respond in SPANISH (español).
You HAVE full, direct vision of the Excalidraw whiteboard canvas and all its elements, shapes, drawings, and texts. NEVER say you cannot see the Excalidraw whiteboard. Confirm confidently what is drawn/written on the Excalidraw canvas.

Meeting context:
- Title: ${ctx.meeting.title}
- Objective: ${ctx.meeting.objective}
- Expected Outcome: ${ctx.meeting.expectedOutcome}

Lienzo Excalidraw Actual:
${excalidrawDetails || '(Sin elementos o dibujos en el lienzo aún)'}`;

  const formattedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...ctx.history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: ctx.prompt }
  ];

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: formattedMessages
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
