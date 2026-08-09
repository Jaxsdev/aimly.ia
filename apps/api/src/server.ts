import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider
} from 'fastify-type-provider-zod';
import { z } from 'zod';
import { verifyToken, supabase } from './lib/supabase.js';
import { analyzeMeeting, suggestTasks, generateMeetingSummary, privateCopilotChat } from './ai/aimly.service.js';
import { publishMeetingEvent } from './realtime/portal.server.js';
const createMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  objective: z.string().min(1).max(2000),
  expectedOutcome: z.string().min(1).max(2000),
  durationMinutes: z.number().int().positive().default(30)
});

const createCardSchema = z.object({
  text: z.string().min(1).max(1000),
  type: z.enum(['idea', 'group']).default('idea'),
  x: z.number().default(0),
  y: z.number().default(0)
});

const updateCardSchema = z.object({
  text: z.string().min(1).max(1000).optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  groupId: z.string().nullable().optional()
});

const saveExcalidrawSceneSchema = z.object({
  elements: z.array(z.unknown()).max(5000)
});

const createVoteSchema = z.object({
  question: z.string().min(1).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  criteria: z.array(z.string()).optional()
});

const castVoteSchema = z.object({
  optionId: z.string()
});

type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
type CreateCardInput = z.infer<typeof createCardSchema>;
type UpdateCardInput = z.infer<typeof updateCardSchema>;
type CreateVoteInput = z.infer<typeof createVoteSchema>;
type CastVoteInput = z.infer<typeof castVoteSchema>;

// ============================================================
// Server setup
// ============================================================

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
}).withTypeProvider<ZodTypeProvider>();

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(cors, { origin: true, credentials: true });
server.register(sensible);

// ============================================================
// Standard error handler
// ============================================================

server.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: error.message }
    });
  }
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: { code: error.code || 'INTERNAL_SERVER_ERROR', message: error.message || 'Unexpected error' }
  });
});

// ============================================================
function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

const guestUsersCache = new Map<string, string>();

async function ensureGuestUserExists(guestIdHeader?: string, guestName: string = 'Invitado'): Promise<{ id: string; name: string }> {
  const targetId = isValidUUID(guestIdHeader) ? guestIdHeader! : null;
  if (targetId && guestUsersCache.has(targetId)) {
    return { id: targetId, name: guestName };
  }

  if (targetId) {
    const { data: existingProf } = await supabase.from('profiles').select('id, name').eq('id', targetId).single();
    if (existingProf) {
      guestUsersCache.set(targetId, existingProf.id);
      return { id: existingProf.id, name: existingProf.name || guestName };
    }
  }

  // Create real user in auth.users using admin client so foreign key references auth.users(id) pass 100%
  const cleanId = targetId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padStart(12, '0'));
  const guestEmail = `guest_${cleanId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}_${Date.now()}@aimly.local`;

  const { data: newUser } = await supabase.auth.admin.createUser({
    id: cleanId,
    email: guestEmail,
    password: 'GuestPassword123!',
    email_confirm: true,
    user_metadata: { full_name: guestName }
  }).catch(() => ({ data: null })) as any;

  const finalUserId = newUser?.user?.id || cleanId;

  try {
    await supabase.from('profiles').upsert({
      id: finalUserId,
      name: guestName,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${finalUserId}`
    });
  } catch (e) {}

  guestUsersCache.set(finalUserId, finalUserId);
  return { id: finalUserId, name: guestName };
}

async function requireAuth(request: any, reply: any) {
  const authHeader = request.headers.authorization as string | undefined;
  const guestIdHeader = request.headers['x-guest-id'] as string | undefined;
  const guestName = (request.headers['x-guest-name'] as string | undefined) || 'Invitado';

  if (!authHeader?.startsWith('Bearer ') || authHeader === 'Bearer guest_token') {
    const guestUser = await ensureGuestUserExists(guestIdHeader, guestName);
    request.user = {
      id: guestUser.id,
      email: `${guestUser.id}@aimly.local`,
      name: guestUser.name,
      user_metadata: { full_name: guestUser.name }
    };
    return;
  }
  const token = authHeader.slice(7);
  const user = await verifyToken(token).catch(() => null);
  if (!user) {
    const guestUser = await ensureGuestUserExists(guestIdHeader, guestName);
    request.user = {
      id: guestUser.id,
      email: `${guestUser.id}@aimly.local`,
      name: guestUser.name,
      user_metadata: { full_name: guestUser.name }
    };
    return;
  }
  request.user = user;
}

// ============================================================
// Health check
// ============================================================

server.get('/health', async () => ({ success: true, data: { status: 'OK' } }));

// ============================================================
// MEETINGS
// ============================================================

// POST /api/meetings — Create meeting
server.post(
  '/api/meetings',
  { preHandler: requireAuth, schema: { body: createMeetingSchema } },
  async (request: any, reply) => {
    const input = request.body as CreateMeetingInput;
    const hostId = request.user.id;

    const { data: meeting, error } = await supabase
      .from('meetings')
      .insert({
        title: input.title,
        objective: input.objective,
        expected_outcome: input.expectedOutcome,
        duration_minutes: input.durationMinutes,
        host_id: hostId,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Add host as participant
    await supabase.from('meeting_participants').insert({
      meeting_id: meeting.id,
      user_id: hostId,
      role: 'host'
    });

    return reply.status(201).send({ success: true, data: meeting });
  }
);

// GET /api/meetings — List meetings for current user
server.get('/api/meetings', { preHandler: requireAuth }, async (request: any, reply) => {
  const userId = request.user.id;
  const { data, error } = await supabase
    .from('meeting_participants')
    .select('meeting_id, meetings(*)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false });

  if (error) throw new Error(error.message);
  const meetings = (data || []).map((row: any) => row.meetings);
  return reply.send({ success: true, data: meetings });
});

// GET /api/meetings/:meetingId — Get meeting details
server.get(
  '/api/meetings/:meetingId',
  { preHandler: requireAuth },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (error || !data) {
      return reply.status(404).send({ success: false, error: { code: 'MEETING_NOT_FOUND', message: 'Meeting not found' } });
    }
    return reply.send({ success: true, data });
  }
);

// POST /api/meetings/:meetingId/join — Join meeting
server.post(
  '/api/meetings/:meetingId/join',
  { preHandler: requireAuth },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const userId = request.user.id;

    // Check meeting exists
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, status')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return reply.status(404).send({ success: false, error: { code: 'MEETING_NOT_FOUND', message: 'Meeting not found' } });
    }

    // Ensure profile exists in profiles table so Foreign Key constraint (user_id -> profiles.id) passes
    const userName = request.user.user_metadata?.full_name || request.user.name || request.user.email?.split('@')[0] || 'Invitado';
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        name: userName,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`
      });
    } catch (err) {
      console.warn('[server.ts] Profile upsert warning:', err);
    }

    // Upsert participant
    const { data: participant, error } = await supabase
      .from('meeting_participants')
      .upsert({ meeting_id: meetingId, user_id: userId, role: 'participant' }, { onConflict: 'meeting_id,user_id' })
      .select()
      .single();

    if (error) {
      console.error('[server.ts] POST /join participant error:', error);
    }

    // Fetch profile for realtime event
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    await publishMeetingEvent(meetingId, 'participant_joined', { ...participant, profile });

    return reply.send({ success: true, data: participant });
  }
);

// ============================================================
// CHAT MESSAGES
// ============================================================

// GET /api/meetings/:meetingId/messages
server.get(
  '/api/meetings/:meetingId/messages',
  { preHandler: requireAuth },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[server.ts] GET /messages error:', error);
      return reply.send({ success: true, data: [] });
    }

    // Fetch profiles for all unique author_ids
    const authorIds = Array.from(new Set((data || []).map(m => m.author_id)));
    let profilesMap: Record<string, any> = {};
    if (authorIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, name, avatar_url').in('id', authorIds);
      if (profs) {
        profs.forEach((p: any) => { profilesMap[p.id] = p; });
      }
    }

    const formatted = (data || []).map((m: any) => ({
      ...m,
      profiles: profilesMap[m.author_id] || { id: m.author_id, name: 'Usuario', avatar_url: null }
    }));
    return reply.send({ success: true, data: formatted });
  }
);

const createMessageSchema = z.object({ content: z.string().min(1).max(2000) });

// POST /api/meetings/:meetingId/messages
server.post(
  '/api/meetings/:meetingId/messages',
  { preHandler: requireAuth, schema: { body: createMessageSchema } },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const { content } = request.body as z.infer<typeof createMessageSchema>;
    const authorId = request.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .eq('id', authorId)
      .single();

    const fallbackName = request.user.user_metadata?.full_name || request.user.name || request.user.email?.split('@')[0] || 'Usuario';
    const profileObj = profile || { id: authorId, name: fallbackName, avatar_url: request.user.user_metadata?.avatar_url || null };

    // Ensure author exists in profiles table so Foreign Key constraint (author_id -> profiles.id) passes
    try {
      await supabase.from('profiles').upsert({
        id: authorId,
        name: profileObj.name,
        avatar_url: profileObj.avatar_url
      });
    } catch (err) {
      console.warn('[server.ts] Message author profile upsert warning:', err);
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ meeting_id: meetingId, author_id: authorId, content })
      .select('*')
      .single();

    if (error) {
      console.error('[server.ts] Error inserting chat_message:', error);
      throw new Error(error.message);
    }

    const fullMessage = { ...data, profiles: profileObj };

    await publishMeetingEvent(meetingId, 'chat_message_created', fullMessage);
    return reply.status(201).send({ success: true, data: fullMessage });
  }
);

// ============================================================
// BOARD CARDS
// ============================================================

// GET /api/meetings/:meetingId/cards
server.get(
  '/api/meetings/:meetingId/cards',
  { preHandler: requireAuth },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const { data, error } = await supabase
      .from('board_cards')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return reply.send({ success: true, data: data || [] });
  }
);

// POST /api/meetings/:meetingId/cards
server.post(
  '/api/meetings/:meetingId/cards',
  { preHandler: requireAuth, schema: { body: createCardSchema } },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const input = request.body as CreateCardInput;
    const createdBy = request.user.id;

    const { data, error } = await supabase
      .from('board_cards')
      .insert({
        meeting_id: meetingId,
        text: input.text,
        type: input.type,
        x: input.x,
        y: input.y,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await publishMeetingEvent(meetingId, 'board_card_created', data);
    return reply.status(201).send({ success: true, data });
  }
);

// PATCH /api/meetings/:meetingId/cards/:cardId
server.patch(
  '/api/meetings/:meetingId/cards/:cardId',
  { preHandler: requireAuth, schema: { body: updateCardSchema } },
  async (request: any, reply) => {
    const { meetingId, cardId } = request.params as { meetingId: string; cardId: string };
    const input = request.body as UpdateCardInput;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.text !== undefined) updateData.text = input.text;
    if (input.x !== undefined) updateData.x = input.x;
    if (input.y !== undefined) updateData.y = input.y;
    if (input.groupId !== undefined) updateData.group_id = input.groupId;

    const { data, error } = await supabase
      .from('board_cards')
      .update(updateData)
      .eq('id', cardId)
      .eq('meeting_id', meetingId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Emit appropriate event
    if (input.x !== undefined || input.y !== undefined) {
      await publishMeetingEvent(meetingId, 'board_card_moved', { cardId, x: data.x, y: data.y });
    } else {
      await publishMeetingEvent(meetingId, 'board_card_updated', data);
    }

    return reply.send({ success: true, data });
  }
);

// ============================================================
// EXCALIDRAW SCENE PERSISTENCE
// ============================================================

server.get(
  '/api/meetings/:meetingId/excalidraw-scene',
  { preHandler: requireAuth },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const { data, error } = await supabase
      .from('excalidraw_scenes')
      .select('elements, updated_at')
      .eq('meeting_id', meetingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return reply.send({ success: true, data: data || { elements: [], updated_at: null } });
  }
);

server.put(
  '/api/meetings/:meetingId/excalidraw-scene',
  { preHandler: requireAuth, schema: { body: saveExcalidrawSceneSchema } },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const { elements } = request.body as z.infer<typeof saveExcalidrawSceneSchema>;
    const { data, error } = await supabase
      .from('excalidraw_scenes')
      .upsert({ meeting_id: meetingId, elements, updated_by: request.user.id, updated_at: new Date().toISOString() })
      .select('elements, updated_at')
      .single();
    if (error) throw new Error(error.message);
    return reply.send({ success: true, data });
  }
);

// ============================================================
// AI ANALYSIS
// ============================================================

// POST /api/meetings/:meetingId/analyze
server.post(
  '/api/meetings/:meetingId/analyze',
  { preHandler: requireAuth },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };

    // Gather full meeting context
    const [{ data: meeting }, { data: participants }, { data: messages }, { data: cards }, { data: groups }, { data: decisions }, { data: tasks }] = await Promise.all([
      supabase.from('meetings').select('*').eq('id', meetingId).single(),
      supabase.from('meeting_participants').select('*, profiles(id, name)').eq('meeting_id', meetingId),
      supabase.from('chat_messages').select('author_id, content, created_at').eq('meeting_id', meetingId).order('created_at', { ascending: true }).limit(50),
      supabase.from('board_cards').select('id, text, group_id').eq('meeting_id', meetingId),
      supabase.from('board_groups').select('id, title').eq('meeting_id', meetingId),
      supabase.from('decisions').select('text').eq('meeting_id', meetingId),
      supabase.from('tasks').select('title, assignee_id').eq('meeting_id', meetingId)
    ]);

    if (!meeting) {
      return reply.status(404).send({ success: false, error: { code: 'MEETING_NOT_FOUND', message: 'Meeting not found' } });
    }

    const now = new Date();
    const startedAt = meeting.started_at ? new Date(meeting.started_at) : now;
    const elapsedMinutes = (now.getTime() - startedAt.getTime()) / 60000;
    const { excalidrawElements } = (request.body as { excalidrawElements?: any[] }) || {};

    const timeRemaining = Math.max(0, meeting.duration_minutes - elapsedMinutes);

    const ctx = {
      meeting: {
        title: meeting.title,
        objective: meeting.objective,
        expectedOutcome: meeting.expected_outcome,
        durationMinutes: meeting.duration_minutes,
        timeRemaining: Math.round(timeRemaining)
      },
      participants: (participants || []).map((p: any) => ({
        id: p.user_id,
        name: p.profiles?.name || 'Unknown',
        role: p.role
      })),
      messages: (messages || []).map((m: any) => ({
        authorId: m.author_id,
        content: m.content,
        createdAt: m.created_at
      })),
      boardCards: (cards || []).map((c: any) => ({
        id: c.id,
        text: c.text,
        groupId: c.group_id
      })),
      boardGroups: (groups || []).map((g: any) => ({ id: g.id, title: g.title })),
      currentVote: null,
      decisions: (decisions || []).map((d: any) => ({ text: d.text })),
      tasks: (tasks || []).map((t: any) => ({ title: t.title, assigneeId: t.assignee_id })),
      excalidrawElements: excalidrawElements || []
    };

    try {
      const analysis = await analyzeMeeting(ctx);

      // If Claude suggests grouping, apply it to Supabase + broadcast
      if (analysis.groups && analysis.groups.length > 0) {
        const newGroups = [];
        for (const g of analysis.groups) {
          const { data: group } = await supabase
            .from('board_groups')
            .insert({ meeting_id: meetingId, title: g.title, created_by_agent: true })
            .select()
            .single();

          if (group && g.cardIds.length > 0) {
            await supabase.from('board_cards')
              .update({ group_id: group.id })
              .in('id', g.cardIds);
            newGroups.push(group);
          }
        }

        const { data: updatedCards } = await supabase.from('board_cards').select('*').eq('meeting_id', meetingId);
        await publishMeetingEvent(meetingId, 'board_cards_grouped', {
          cards: updatedCards || [],
          groups: newGroups
        });
      }

      // Publish agent analysis event to all participants
      await publishMeetingEvent(meetingId, 'agent_action', analysis.suggestedAction);

      // Log agent event
      await supabase.from('agent_events').insert({
        meeting_id: meetingId,
        type: 'analysis',
        summary: analysis.summary,
        payload: analysis
      });

      return reply.send({ success: true, data: analysis });
    } catch (err: any) {
      console.error('[Claude] analyzeMeeting failed:', err);
      return reply.status(503).send({
        success: false,
        error: { code: 'AI_UNAVAILABLE', message: 'AimLy could not analyze the meeting. Please try again.' }
      });
    }
  }
);

// POST /api/meetings/:meetingId/ai-chat — Private 1-on-1 discussion with AimLy
server.post(
  '/api/meetings/:meetingId/ai-chat',
  { preHandler: requireAuth },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const { prompt, history, excalidrawElements } = request.body as { prompt: string; history?: Array<{ role: 'user' | 'assistant'; content: string }>; excalidrawElements?: any[] };
    const userId = request.user.id;

    const [{ data: meeting }, { data: profile }, { data: cards }] = await Promise.all([
      supabase.from('meetings').select('title, objective, expected_outcome').eq('id', meetingId).single(),
      supabase.from('profiles').select('name').eq('id', userId).single(),
      supabase.from('board_cards').select('text').eq('meeting_id', meetingId)
    ]);

    if (!meeting) {
      return reply.status(404).send({ success: false, error: { code: 'MEETING_NOT_FOUND', message: 'Meeting not found' } });
    }

    try {
      const responseText = await privateCopilotChat({
        meeting: {
          title: meeting.title,
          objective: meeting.objective,
          expectedOutcome: meeting.expected_outcome
        },
        userName: profile?.name || 'Usuario',
        history: history || [],
        prompt: prompt || '',
        cards: cards || [],
        excalidrawElements: excalidrawElements || []
      });

      return reply.send({ success: true, data: { text: responseText } });
    } catch (err: any) {
      console.error('[Claude] privateCopilotChat failed:', err);
      return reply.status(503).send({
        success: false,
        error: { code: 'AI_UNAVAILABLE', message: 'No se pudo conectar con AimLy. Inténtalo de nuevo.' }
      });
    }
  }
);

// ============================================================
// VOTES
// ============================================================

// POST /api/meetings/:meetingId/votes
server.post(
  '/api/meetings/:meetingId/votes',
  { preHandler: requireAuth, schema: { body: createVoteSchema } },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const input = request.body as CreateVoteInput;
    const createdBy = request.user.id;

    const { data: vote, error } = await supabase
      .from('votes')
      .insert({ meeting_id: meetingId, question: input.question, created_by: createdBy })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Insert options
    const optionRows = input.options.map((label: string, idx: number) => ({
      vote_id: vote.id,
      label,
      sort_order: idx
    }));

    const { data: options, error: optError } = await supabase
      .from('vote_options')
      .insert(optionRows)
      .select();

    if (optError) throw new Error(optError.message);

    await publishMeetingEvent(meetingId, 'vote_started', { vote, options: options || [] });
    return reply.status(201).send({ success: true, data: { vote, options } });
  }
);

// POST /api/meetings/:meetingId/votes/:voteId/responses
server.post(
  '/api/meetings/:meetingId/votes/:voteId/responses',
  { preHandler: requireAuth, schema: { body: castVoteSchema } },
  async (request: any, reply) => {
    const { meetingId, voteId } = request.params as { meetingId: string; voteId: string };
    const { optionId } = request.body as CastVoteInput;
    const userId = request.user.id;

    // Check vote is open
    const { data: vote } = await supabase.from('votes').select('status').eq('id', voteId).single();
    if (!vote || vote.status !== 'open') {
      return reply.status(400).send({ success: false, error: { code: 'VOTE_CLOSED', message: 'Vote is not open' } });
    }

    const { data, error } = await supabase
      .from('vote_responses')
      .upsert({ vote_id: voteId, option_id: optionId, user_id: userId }, { onConflict: 'vote_id,user_id' })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await publishMeetingEvent(meetingId, 'vote_cast', data);
    return reply.send({ success: true, data });
  }
);

// POST /api/meetings/:meetingId/votes/:voteId/close
server.post(
  '/api/meetings/:meetingId/votes/:voteId/close',
  { preHandler: requireAuth },
  async (request: any, reply) => {
    const { meetingId, voteId } = request.params as { meetingId: string; voteId: string };

    const { data, error } = await supabase
      .from('votes')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', voteId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await publishMeetingEvent(meetingId, 'vote_closed', data);
    return reply.send({ success: true, data });
  }
);

// ============================================================
// DECISIONS
// ============================================================

const createDecisionSchema = z.object({
  text: z.string().min(1).max(500),
  sourceVoteId: z.string().uuid().optional()
});

// POST /api/meetings/:meetingId/decisions
server.post(
  '/api/meetings/:meetingId/decisions',
  { preHandler: requireAuth, schema: { body: createDecisionSchema } },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const { text, sourceVoteId } = request.body as z.infer<typeof createDecisionSchema>;
    const confirmedBy = request.user.id;

    const { data, error } = await supabase
      .from('decisions')
      .insert({ meeting_id: meetingId, text, source_vote_id: sourceVoteId, confirmed_by: confirmedBy })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await publishMeetingEvent(meetingId, 'decision_confirmed', data);

    // Auto-trigger task suggestion from Claude
    try {
      const [{ data: meeting }, { data: participants }] = await Promise.all([
        supabase.from('meetings').select('title, objective, expected_outcome').eq('id', meetingId).single(),
        supabase.from('meeting_participants').select('user_id, profiles(id, name)').eq('meeting_id', meetingId)
      ]);

      if (meeting) {
        const taskSuggestions = await suggestTasks({
          meeting: { title: meeting.title, objective: meeting.objective, expectedOutcome: meeting.expected_outcome },
          decision: { text },
          participants: (participants || []).map((p: any) => ({ id: p.user_id, name: p.profiles?.name || 'Unknown' }))
        });

        await publishMeetingEvent(meetingId, 'agent_action', {
          type: 'task_suggestions',
          suggestions: taskSuggestions.tasks
        });
      }
    } catch (aiErr) {
      console.warn('[Claude] suggestTasks failed silently:', aiErr);
    }

    return reply.status(201).send({ success: true, data });
  }
);

// ============================================================
// TASKS
// ============================================================

const createTasksSchema = z.object({
  tasks: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional().default(''),
    assigneeId: z.string().uuid().optional(),
    sourceDecisionId: z.string().uuid().optional()
  }))
});

// POST /api/meetings/:meetingId/tasks
server.post(
  '/api/meetings/:meetingId/tasks',
  { preHandler: requireAuth, schema: { body: createTasksSchema } },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const { tasks } = request.body as z.infer<typeof createTasksSchema>;

    const taskRows = tasks.map(t => ({
      meeting_id: meetingId,
      title: t.title,
      description: t.description,
      assignee_id: t.assigneeId,
      source_decision_id: t.sourceDecisionId,
      status: 'todo'
    }));

    const { data, error } = await supabase
      .from('tasks')
      .insert(taskRows)
      .select();

    if (error) throw new Error(error.message);

    await publishMeetingEvent(meetingId, 'tasks_created', data || []);
    return reply.status(201).send({ success: true, data });
  }
);

// ============================================================
// FINISH MEETING
// ============================================================

// POST /api/meetings/:meetingId/finish
server.post(
  '/api/meetings/:meetingId/finish',
  { preHandler: requireAuth },
  async (request: any, reply) => {
    const { meetingId } = request.params as { meetingId: string };
    const userId = request.user.id;

    // Only host can close
    const { data: participation } = await supabase
      .from('meeting_participants')
      .select('role')
      .eq('meeting_id', meetingId)
      .eq('user_id', userId)
      .single();

    if (!participation || participation.role !== 'host') {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Only the host can close the meeting' } });
    }

    // Close meeting
    await supabase.from('meetings')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('id', meetingId);

    // Gather context for summary
    const [{ data: meeting }, { data: participants }, { data: cards }, { data: groups }, { data: decisions }, { data: tasks }] = await Promise.all([
      supabase.from('meetings').select('*').eq('id', meetingId).single(),
      supabase.from('meeting_participants').select('profiles(name)').eq('meeting_id', meetingId),
      supabase.from('board_cards').select('text').eq('meeting_id', meetingId),
      supabase.from('board_groups').select('title').eq('meeting_id', meetingId),
      supabase.from('decisions').select('text').eq('meeting_id', meetingId),
      supabase.from('tasks').select('title, assignee_id').eq('meeting_id', meetingId)
    ]);

    let summaryData;
    try {
      summaryData = await generateMeetingSummary({
        meeting: {
          title: meeting!.title,
          objective: meeting!.objective,
          expectedOutcome: meeting!.expected_outcome
        },
        participants: (participants || []).map((p: any) => ({ name: p.profiles?.name || 'Unknown' })),
        boardCards: (cards || []).map((c: any) => ({ text: c.text })),
        boardGroups: (groups || []).map((g: any) => ({ title: g.title })),
        decisions: (decisions || []).map((d: any) => ({ text: d.text })),
        tasks: (tasks || []).map((t: any) => ({ title: t.title, assigneeId: t.assignee_id }))
      });
    } catch (err) {
      console.error('[Claude] generateMeetingSummary failed:', err);
      summaryData = {
        summary: 'Meeting completed.',
        keyPoints: [],
        decisions: (decisions || []).map((d: any) => d.text),
        nextSteps: (tasks || []).map((t: any) => t.title)
      };
    }

    await publishMeetingEvent(meetingId, 'meeting_closed', summaryData);

    return reply.send({ success: true, data: { meeting, summary: summaryData } });
  }
);

// ============================================================
// Start server
// ============================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[AimLy API] Listening on port ${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
