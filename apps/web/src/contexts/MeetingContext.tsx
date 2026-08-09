import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
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

interface MeetingContextType {
  meeting: any | null;
  messages: any[];
  cards: any[];
  participants: Participant[];
  collaborators: Map<string, any>;
  loading: boolean;
  isConnected: boolean;
  sendMessage: (content: string) => Promise<void>;
  createCard: (card: any) => Promise<void>;
  updateCard: (cardId: string, updates: any) => Promise<void>;
  refreshMeeting: () => Promise<void>;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function MeetingProvider({ meetingId, children }: { meetingId: string; children: React.ReactNode }) {
  const { user, signInAnonymously, loading: authLoading } = useAuth();
  const [meeting, setMeeting] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [collaborators, setCollaborators] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const knownElementsRef = useRef<Map<string, number>>(new Map());

  // Keep a ref to the channel so we can clean it up
  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── Initial data fetch ──────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!meetingId) return;
    try {
      if (user) {
        await api.meetings.join(meetingId).catch(console.warn);
      }

      const [m, msg, crd] = await Promise.all([
        api.meetings.get(meetingId).catch(() => null),
        api.messages.list(meetingId).catch(() => []),
        api.cards.list(meetingId).catch(() => [])
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

  const guestAttemptedRef = useRef(false);

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

      // ── Ultra-Fast Delta WebSocket Drawing Broadcast (Canva/Figma speed) ────
      .on('broadcast', { event: 'excalidraw_delta' }, ({ payload }) => {
        if (payload?.deltas && Array.isArray(payload.deltas) && payload.deltas.length > 0) {
          if ((window as any).excalidrawAPI) {
            (window as any).isIncomingSync = true;
            const currentElements = (window as any).excalidrawAPI.getSceneElements() || [];
            const elementMap = new Map<string, any>(currentElements.map((el: any) => [el.id, el]));

            for (const delta of payload.deltas) {
              const existing = elementMap.get(delta.id);
              if (!existing || (delta.version && delta.version >= (existing.version || 0))) {
                elementMap.set(delta.id, delta);
                knownElementsRef.current.set(delta.id, delta.version || 0);
              }
            }

            const merged = Array.from(elementMap.values());
            try {
              localStorage.setItem(`excalidraw_scene_${meetingId}`, JSON.stringify(merged));
            } catch (e) {}

            (window as any).excalidrawAPI.updateScene({ elements: merged });
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
              pointer: { x: payload.x, y: payload.y },
              username: payload.name || 'Compañero',
              color: '#F15A24'
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
          setIsConnected(true);
          // Track presence: broadcast our own info
          await channel.track({
            userId: user.id,
            name: (user as any).user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
            avatarUrl: (user as any).user_metadata?.avatar_url,
            joinedAt: new Date().toISOString()
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
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
        channelRef.current.send({
          type: 'broadcast',
          event: 'excalidraw_delta',
          payload: { deltas: changedDeltas }
        });
      }
    };

    (window as any).broadcastPointer = (pointer: { x: number; y: number }) => {
      const now = Date.now();
      if (now - ((window as any).lastPointerBroadcast || 0) > 50) { // 20fps throttled
        (window as any).lastPointerBroadcast = now;
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'mouse_move',
            payload: {
              x: pointer.x,
              y: pointer.y,
              userId: user.id,
              name: (user as any).user_metadata?.full_name || user.email?.split('@')[0] || 'Compañero'
            }
          });
        }
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
          } catch (e) {}
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
      } catch (e) {}
    }, 2000);

    return () => {
      clearInterval(pollInterval);
      unsubscribePortal();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [meetingId, user, authLoading, signInAnonymously, fetchAll]);

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
    const tempCard = {
      id: `temp-${Date.now()}`,
      meeting_id: meetingId,
      ...cardData,
      created_at: new Date().toISOString()
    };
    setCards(prev => [...prev, tempCard]);

    const newCard = await api.cards.create(meetingId, cardData) as any;
    setCards(prev => prev.map(c => c.id === tempCard.id ? newCard : c));
  };

  const updateCard = async (cardId: string, updates: any) => {
    // Optimistic update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updates } : c));
    await api.cards.update(meetingId, cardId, updates);
  };

  return (
    <MeetingContext.Provider value={{
      meeting,
      messages,
      cards,
      participants,
      collaborators,
      loading,
      isConnected,
      sendMessage,
      createCard,
      updateCard,
      refreshMeeting: fetchAll
    }}>
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeeting() {
  const ctx = useContext(MeetingContext);
  if (!ctx) throw new Error('useMeeting must be used within MeetingProvider');
  return ctx;
}
