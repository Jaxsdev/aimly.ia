import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CaptureUpdateAction, reconcileElements } from '@excalidraw/excalidraw';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { subscribeToMeeting, sendPortalEvent } from '../realtime/portal.client';
import { useAuth } from './AuthContext';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Participant {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  isOnline: boolean;
}

export interface ReadinessParticipant { user_id: string; role: string; is_ready: boolean; ready_at?: string | null; profiles?: { id: string; name: string } | null; }
export interface SharedMusicState { videoId: string; playing: boolean; position: number; startedAt: number | null; updatedAt: number; }

interface MeetingContextType {
  meeting: any | null;
  messages: any[];
  cards: any[];
  participants: Participant[];
  readiness: ReadinessParticipant[];
  collaborators: Map<string, any>;
  stickyCursors: Map<string, { x: number; y: number; name: string }>;
  loading: boolean;
  isConnected: boolean;
  sharedMusic: SharedMusicState | null;
  setSharedMusic: (music: SharedMusicState | null) => void;
  sendMessage: (content: string) => Promise<void>;
  createCard: (card: any) => Promise<void>;
  updateCard: (cardId: string, updates: any) => Promise<void>;
  refreshMeeting: () => Promise<void>;
  setReady: (isReady: boolean) => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function MeetingProvider({ meetingId, children }: { meetingId: string; children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [meeting, setMeeting] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [readiness, setReadiness] = useState<ReadinessParticipant[]>([]);
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());
  const [stickyCursors, setStickyCursors] = useState<Map<string, { x: number; y: number; name: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [sharedMusic, setSharedMusicState] = useState<SharedMusicState | null>(null);

  const knownElementsRef = useRef<Map<string, number>>(new Map());

  // Keep a ref to the channel so we can clean it up
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelReadyRef = useRef(false);

  const sendBroadcast = (event: string, payload: unknown) => {
    if (!channelRef.current || !channelReadyRef.current) return;
    channelRef.current.send({ type: 'broadcast', event, payload })
      .catch((error) => console.warn(`[Realtime] No se pudo publicar ${event}.`, error));
  };

  // ── Initial data fetch ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!meetingId) return;
    try {
      if (user) {
        await api.meetings.join(meetingId).catch(console.warn);
      }

      const [m, msg, crd, ready] = await Promise.all([
        api.meetings.get(meetingId).catch(() => null),
        api.messages.list(meetingId).catch(() => []),
        api.cards.list(meetingId).catch(() => []),
        api.meetings.readiness(meetingId).catch(() => [])
      ]);

      const activeMeeting = m || {
        id: meetingId,
        title: 'Reunión de Hackathon',
        objective: 'Definir propuesta del proyecto',
        expected_outcome: 'Ideas seleccionadas y próximas tareas',
        status: 'active',
        duration_minutes: 30,
        created_at: new Date().toISOString()
      };

      setMeeting(activeMeeting);
      setMessages(Array.isArray(msg) ? msg : []);
      setCards(Array.isArray(crd) ? crd : []);
      setReadiness(Array.isArray(ready) ? ready : []);
    } catch (err) {
      console.error('[MeetingContext] Error fetching initial data:', err);
      setMeeting({
        id: meetingId,
        title: 'Reunión de Hackathon',
        objective: 'Definir propuesta del proyecto',
        expected_outcome: 'Ideas seleccionadas y próximas tareas',
        status: 'active',
        duration_minutes: 30
      });
    } finally {
      setLoading(false);
    }
  }, [meetingId, user]);

  // ── Supabase Realtime subscription ─────────────────────────
  useEffect(() => {
    if (!meetingId) return;

    if (!user) return;

    fetchAll();

    // Create a single channel for this meeting room
    const channel = supabase
      .channel(`meeting:${meetingId}`, {
        config: {
          presence: { key: user.id }
        }
      })

      // ── New chat messages ──────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          setMessages(prev => {
            // Avoid duplicates (optimistic updates already added it)
            const exists = prev.some(m => m.id === payload.new.id);
            return exists ? prev : [...prev, payload.new];
          });
        }
      )

      // ── New cards ──────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'board_cards',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          setCards(prev => {
            const exists = prev.some(c => c.id === payload.new.id);
            return exists ? prev : [...prev, payload.new];
          });
        }
      )

      // ── Card updates (move, text edit, group) ──────────────
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'board_cards',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          setCards(prev =>
            prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c)
          );
        }
      )

      // ── Card deletions ─────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'board_cards',
          filter: `meeting_id=eq.${meetingId}`
        },
        (payload) => {
          setCards(prev => prev.filter(c => c.id !== payload.old.id));
        }
      )

      // ── Meeting status changes (active → closed) ───────────
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${meetingId}`
        },
        (payload) => {
          setMeeting((prev: any) => prev ? { ...prev, ...payload.new } : payload.new);
        }
      )

      // ── Instant WebSocket Group Chat Broadcast ────────────────
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        if (payload?.id) {
          setMessages(prev => prev.some(m => m.id === payload.id) ? prev : [...prev, payload]);
        }
      })

      .on('broadcast', { event: 'board_card_created' }, ({ payload }) => {
        if (!payload?.id) return;
        setCards(prev => prev.some(card => card.id === payload.id) ? prev : [...prev, payload]);
      })

      .on('broadcast', { event: 'board_card_updated' }, ({ payload }) => {
        if (!payload?.id) return;
        setCards(prev => prev.map(card => card.id === payload.id ? { ...card, ...payload } : card));
      })

      .on('broadcast', { event: 'participant_readiness_changed' }, ({ payload }) => {
        if (!payload?.user_id) return;
        setReadiness(prev => prev.some(participant => participant.user_id === payload.user_id)
          ? prev.map(participant => participant.user_id === payload.user_id ? payload : participant)
          : [...prev, payload]);
      })
      .on('broadcast', { event: 'shared_music_changed' }, ({ payload }) => {
        setSharedMusicState(payload || null);
      })

      .on('broadcast', { event: 'sticky_cursor' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user.id) return;
        setStickyCursors(prev => {
          const next = new Map(prev);
          next.set(payload.userId, { x: payload.x, y: payload.y, name: payload.name || 'Compañero' });
          return next;
        });
      })

      // ── Ultra-Fast Delta WebSocket Drawing Broadcast (Canva/Figma speed) ────
      .on('broadcast', { event: 'excalidraw_delta' }, ({ payload }) => {
        if (payload?.deltas && Array.isArray(payload.deltas) && payload.deltas.length > 0) {
          if ((window as any).excalidrawAPI) {
            // Defer scene updates if local user is drawing to prevent stroke flickering/erasure
            if ((window as any).isUserDrawing) {
              (window as any).pendingDeltas = [
                ...((window as any).pendingDeltas || []),
                ...payload.deltas
              ];
              return;
            }

            (window as any).isIncomingSync = true;
            const api = (window as any).excalidrawAPI;
            const currentElements = api.getSceneElementsIncludingDeleted() || [];
            const appState = api.getAppState();
            const merged = reconcileElements(currentElements as any, payload.deltas as any, appState as any);
            for (const element of payload.deltas) {
              knownElementsRef.current.set(element.id, element.version || 0);
            }
            try {
              localStorage.setItem(`excalidraw_scene_${meetingId}`, JSON.stringify(merged));
            } catch {}

            api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
            setTimeout(() => {
              (window as any).isIncomingSync = false;
            }, 50);
          }
        }
      })

      // ── Realtime Mouse Cursors Sync ──────────────────────────
      .on('broadcast', { event: 'mouse_move' }, ({ payload }) => {
        if (payload?.userId && payload.userId !== user.id) {
          setCollaborators(prev => {
            const next = new Map(prev);
            next.set(payload.userId, {
              pointer: { x: payload.x, y: payload.y, tool: payload.tool || 'pointer' },
              button: payload.button || 'up',
              username: payload.name || 'Compañero',
              color: { background: '#F15A24', stroke: '#FFFFFF' }
            });
            return next;
          });
        }
      })

      // ── Presence: who's online ─────────────────────────────
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ name: string; avatarUrl?: string }>();
        const online: Participant[] = Object.entries(state).map(([userId, presences]) => {
          const p = presences[0];
          return {
            id: userId,
            userId,
            name: (p as any).name || 'Participante',
            avatarUrl: (p as any).avatarUrl,
            isOnline: true
          };
        });
        setParticipants(online);
      })

      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          channelReadyRef.current = true;
          setIsConnected(true);
          // Track presence: broadcast our own info
          await channel.track({
            userId: user.id,
            name: (user as any).user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            avatarUrl: (user as any).user_metadata?.avatar_url,
            joinedAt: new Date().toISOString()
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          channelReadyRef.current = false;
          setIsConnected(false);
        }
      });

    channelRef.current = channel;
    (window as any).broadcastDelta = (elements: any[]) => {
      if (!channelRef.current || !elements || elements.length === 0) return;

      const changedDeltas: any[] = [];
      for (const el of elements) {
        const lastVer = knownElementsRef.current.get(el.id);
        const curVer = el.version || 0;
        if (lastVer === undefined || curVer !== lastVer) {
          knownElementsRef.current.set(el.id, curVer);
          changedDeltas.push(el);
        }
      }

      if (changedDeltas.length > 0) {
        sendBroadcast('excalidraw_delta', { deltas: changedDeltas });
      }
    };

    (window as any).broadcastPointer = (pointer: { x: number; y: number; tool?: 'pointer' | 'laser' }, button: 'up' | 'down') => {
      const now = Date.now();
      if (now - ((window as any).lastPointerBroadcast || 0) > 50) { // 20fps throttled
        (window as any).lastPointerBroadcast = now;
        if (channelRef.current) {
          sendBroadcast('mouse_move', {
            x: pointer.x,
            y: pointer.y,
            tool: pointer.tool || 'pointer',
            button,
            userId: user.id,
            name: (user as any).user_metadata?.full_name || user.email?.split('@')[0] || 'Compañero'
          });
        }
      }
    };

    (window as any).broadcastStickyCursor = (x: number, y: number) => {
      const now = Date.now();
      if (now - ((window as any).lastStickyCursorBroadcast || 0) < 50) return;
      (window as any).lastStickyCursorBroadcast = now;
      sendBroadcast('sticky_cursor', {
        x,
        y,
        userId: user.id,
        name: (user as any).user_metadata?.full_name || user.email?.split('@')[0] || 'Compañero'
      });
    };

    (window as any).flushPendingDeltas = () => {
      const pending = (window as any).pendingDeltas;
      if (pending && pending.length > 0 && (window as any).excalidrawAPI) {
        (window as any).pendingDeltas = [];
        (window as any).isIncomingSync = true;
        const api = (window as any).excalidrawAPI;
        const merged = reconcileElements(
          api.getSceneElementsIncludingDeleted() || [],
          pending,
          api.getAppState()
        );
        for (const element of pending) {
          knownElementsRef.current.set(element.id, element.version || 0);
        }
        try {
          localStorage.setItem(`excalidraw_scene_${meetingId}`, JSON.stringify(merged));
        } catch {}
        api.updateScene({ elements: merged, captureUpdate: CaptureUpdateAction.NEVER });
        setTimeout(() => {
          (window as any).isIncomingSync = false;
        }, 50);
      }
    };

    // Portal Realtime channel subscription for custom events & AI notifications & Excalidraw sync
    const unsubscribePortal = subscribeToMeeting(meetingId, (event: any) => {
      console.log('[Portal Realtime Event received]:', event);
      if (event.type === 'chat_message_created' || event.type === 'chat_message') {
        const newMsg = event.payload || event.data || event;
        if (newMsg?.id) {
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      } else if (event.type === 'agent_action' && event.payload?.action === 'excalidraw_sync') {
        const remoteElements = event.payload.elements;
        if (remoteElements) {
          try {
            localStorage.setItem(`excalidraw_scene_${meetingId}`, JSON.stringify(remoteElements));
          } catch {}
          if ((window as any).excalidrawAPI) {
            (window as any).excalidrawAPI.updateScene({ elements: remoteElements });
          }
        }
      } else if (event.type === 'agent_message' || event.type === 'agent_action') {
        // Trigger a refresh if AI produced an action or event
        fetchAll();
      }
    });

    // Polling backup every 2 seconds to guarantee 100% message sync across all browsers/roles
    const pollInterval = setInterval(async () => {
      try {
        const msgData: any = await api.messages.get(meetingId);
        if (Array.isArray(msgData)) {
          setMessages(prev => {
            // Keep local optimistic messages if any exist
            const tempMessages = prev.filter(m => m.id.startsWith('temp-'));
            const serverIds = new Set(msgData.map(m => m.id));
            const filteredTemp = tempMessages.filter(m => !serverIds.has(m.id));
            return [...msgData, ...filteredTemp];
          });
        }
      } catch {}
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      unsubscribePortal();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      channelReadyRef.current = false;
      setIsConnected(false);
    };
  }, [meetingId, user, authLoading, fetchAll]);

  // ── Mutations ───────────────────────────────────────────────

  const sendMessage = async (content: string) => {
    const userProfile = {
      name: (user as any)?.user_metadata?.full_name || (user as any)?.name || user?.email?.split('@')[0] || 'Usuario',
      avatar_url: (user as any)?.user_metadata?.avatar_url
    };

    const tempMsg = {
      id: `temp-${Date.now()}`,
      meeting_id: meetingId,
      author_id: user?.id,
      content,
      created_at: new Date().toISOString(),
      profiles: userProfile
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const newMsg = await api.messages.create(meetingId, content) as any;
      const msgWithProfile = { ...newMsg, profiles: userProfile };
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? msgWithProfile : m));

      // Broadcast message over Portal WebSocket instantly to all room participants
      sendPortalEvent(meetingId, { type: 'chat_message_created', payload: msgWithProfile } as any);

      // Also broadcast over direct Supabase channel
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'chat_message',
          payload: msgWithProfile
        });
      }
    } catch (err) {
      console.error('[MeetingContext] Failed to send chat message:', err);
    }
  };

  const createCard = async (cardData: any) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;
    const newCard = {
      id,
      meeting_id: meetingId,
      ...cardData,
      created_at: new Date().toISOString()
    };
    setCards(prev => [...prev, newCard]);
    sendBroadcast('board_card_created', newCard);
    try {
      const savedCard = await api.cards.create(meetingId, newCard) as any;
      setCards(prev => prev.map(card => card.id === id ? { ...card, ...savedCard } : card));
    } catch (error) {
      setCards(prev => prev.filter(card => card.id !== id));
      throw error;
    }
  };

  const updateCard = async (cardId: string, updates: any) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates } : c));
    sendBroadcast('board_card_updated', { id: cardId, ...updates });
    try {
      const updatedCard = await api.cards.update(meetingId, cardId, updates) as any;
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updatedCard } : c));
    } catch (error) {
      await fetchAll();
      throw error;
    }
  };

  const setReady = async (isReady: boolean) => {
    const updated: any = await api.meetings.setReady(meetingId, isReady);
    setReadiness(prev => {
      const exists = prev.some(participant => participant.user_id === updated.user_id);
      return exists ? prev.map(participant => participant.user_id === updated.user_id ? updated : participant) : [...prev, updated];
    });
    sendBroadcast('participant_readiness_changed', updated);
  };

  const setSharedMusic = (music: SharedMusicState | null) => {
    setSharedMusicState(music);
    sendBroadcast('shared_music_changed', music);
  };

  return (
    <MeetingContext.Provider value={{
      meeting,
      messages,
      cards,
      participants,
      readiness,
      collaborators,
      stickyCursors,
      loading,
      isConnected,
      sharedMusic,
      setSharedMusic,
      sendMessage,
      createCard,
      updateCard,
      refreshMeeting: fetchAll,
      setReady
    }}>
      {children}
    </MeetingContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components
export function useMeeting() {
  const ctx = useContext(MeetingContext);
  if (!ctx) throw new Error('useMeeting must be used within MeetingProvider');
  return ctx;
}
