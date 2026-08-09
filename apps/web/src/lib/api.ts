import { getAccessToken } from '../lib/supabase.js';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://aimly-api.onrender.com' : 'http://localhost:3001');

function isValidUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function authHeaders(hasBody: boolean): Promise<Record<string, string>> {
  const token = await getAccessToken().catch(() => null);
  let guestId = '';
  let guestName = '';
  try {
    const raw = localStorage.getItem('aimly_guest_user');
    if (raw) {
      const g = JSON.parse(raw);
      guestId = g.id || '';
      guestName = g.name || '';
    }
  } catch (e) {}

  return {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    Authorization: token ? `Bearer ${token}` : 'Bearer guest_token',
    ...(guestId ? { 'X-Guest-Id': guestId, 'X-Guest-Name': guestName } : {})
  };
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const hasBody = body !== undefined || method === 'POST' || method === 'PUT' || method === 'PATCH';
  const headers = await authHeaders(hasBody);
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body ?? {}) : undefined
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message || 'API error');
  }
  return json.data;
}

// ============================================================
// Meetings
// ============================================================

export const api = {
  meetings: {
    create: (body: { title: string; objective: string; expectedOutcome: string; durationMinutes: number }) =>
      apiRequest('POST', '/api/meetings', body),

    list: () => apiRequest('GET', '/api/meetings'),

    get: (meetingId: string) => apiRequest('GET', `/api/meetings/${meetingId}`),

    updateFocus: (meetingId: string, body: { objective: string; expectedOutcome: string }) =>
      apiRequest('PATCH', `/api/meetings/${meetingId}/focus`, body),

    join: (meetingId: string) => apiRequest('POST', `/api/meetings/${meetingId}/join`),

    analyze: (meetingId: string) => apiRequest('POST', `/api/meetings/${meetingId}/analyze`),

    finish: (meetingId: string) => apiRequest('POST', `/api/meetings/${meetingId}/finish`)
  },

  messages: {
    list: (meetingId: string) => apiRequest('GET', `/api/meetings/${meetingId}/messages`),
    get: (meetingId: string) => apiRequest('GET', `/api/meetings/${meetingId}/messages`),
    create: (meetingId: string, content: string) =>
      apiRequest('POST', `/api/meetings/${meetingId}/messages`, { content })
  },

  cards: {
    list: (meetingId: string) => apiRequest('GET', `/api/meetings/${meetingId}/cards`),

    create: (meetingId: string, card: { id: string; text: string; type: 'idea'; x: number; y: number; color?: string }) =>
      apiRequest('POST', `/api/meetings/${meetingId}/cards`, card),

    update: (meetingId: string, cardId: string, updates: { text?: string; x?: number; y?: number; groupId?: string | null }) =>
      apiRequest('PATCH', `/api/meetings/${meetingId}/cards/${cardId}`, updates)
  },

  excalidraw: {
    getScene: (meetingId: string) => apiRequest<{ elements: any[]; updated_at: string | null }>('GET', `/api/meetings/${meetingId}/excalidraw-scene`),
    saveScene: (meetingId: string, elements: readonly any[]) =>
      apiRequest('PUT', `/api/meetings/${meetingId}/excalidraw-scene`, { elements })
  },

  votes: {
    create: (meetingId: string, body: { question: string; options: string[]; criteria?: string[] }) =>
      apiRequest('POST', `/api/meetings/${meetingId}/votes`, body),

    castResponse: (meetingId: string, voteId: string, optionId: string) =>
      apiRequest('POST', `/api/meetings/${meetingId}/votes/${voteId}/responses`, { optionId }),

    close: (meetingId: string, voteId: string) =>
      apiRequest('POST', `/api/meetings/${meetingId}/votes/${voteId}/close`)
  },

  decisions: {
    create: (meetingId: string, body: { text: string; sourceVoteId?: string }) =>
      apiRequest('POST', `/api/meetings/${meetingId}/decisions`, body)
  },

  tasks: {
    create: (meetingId: string, tasks: Array<{ title: string; description?: string; assigneeId?: string; sourceDecisionId?: string }>) =>
      apiRequest('POST', `/api/meetings/${meetingId}/tasks`, { tasks })
  },

  aimly: {
    analyze: (meetingId: string, excalidrawElements?: any[]) => apiRequest('POST', `/api/meetings/${meetingId}/analyze`, { excalidrawElements }),
    chat: (meetingId: string, prompt: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>, excalidrawElements?: any[]) =>
      apiRequest('POST', `/api/meetings/${meetingId}/ai-chat`, { prompt, history, excalidrawElements })
  }
};
