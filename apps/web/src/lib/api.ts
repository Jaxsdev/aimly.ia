import { getAccessToken } from '../lib/supabase.js';

const API_URL = import.meta.env.VITE_API_URL || '';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
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

    join: (meetingId: string) => apiRequest('POST', `/api/meetings/${meetingId}/join`),

    analyze: (meetingId: string) => apiRequest('POST', `/api/meetings/${meetingId}/analyze`),

    finish: (meetingId: string) => apiRequest('POST', `/api/meetings/${meetingId}/finish`)
  },

  messages: {
    list: (meetingId: string) => apiRequest('GET', `/api/meetings/${meetingId}/messages`),
    create: (meetingId: string, content: string) =>
      apiRequest('POST', `/api/meetings/${meetingId}/messages`, { content })
  },

  cards: {
    list: (meetingId: string) => apiRequest('GET', `/api/meetings/${meetingId}/cards`),

    create: (meetingId: string, card: { text: string; type: 'idea'; x: number; y: number }) =>
      apiRequest('POST', `/api/meetings/${meetingId}/cards`, card),

    update: (meetingId: string, cardId: string, updates: { text?: string; x?: number; y?: number; groupId?: string | null }) =>
      apiRequest('PATCH', `/api/meetings/${meetingId}/cards/${cardId}`, updates)
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
  }
};
