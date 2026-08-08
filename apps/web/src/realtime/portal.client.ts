import { Portal } from '@portalsdk/core';
import type { MeetingRealtimeEvent } from '@aimly/shared';

// ============================================================
// Singleton Portal client
// ============================================================

let portalInstance: Portal | null = null;

export function getPortalClient(): Portal {
  if (!portalInstance) {
    const apiKey = import.meta.env.VITE_PORTAL_PUBLIC_KEY as string;
    portalInstance = new Portal({ apiKey: apiKey || '' });
  }
  return portalInstance;
}

/**
 * Channel name convention: room:{meetingId}
 */
export function roomChannel(meetingId: string): string {
  return `room:${meetingId}`;
}

/**
 * Subscribe to a meeting channel and receive typed events.
 * Returns an unsubscribe function.
 */
export function subscribeToMeeting(
  meetingId: string,
  onEvent: (event: MeetingRealtimeEvent) => void
): () => void {
  const portal = getPortalClient();
  const channel = roomChannel(meetingId);
  
  // Portal channel subscription — adapter layer hides the SDK details
  const unsubscribe = (portal as any).subscribe?.(channel, (message: any) => {
    try {
      const event = message as MeetingRealtimeEvent;
      onEvent(event);
    } catch (err) {
      console.error('[Portal] Failed to parse event:', err);
    }
  });

  return typeof unsubscribe === 'function' ? unsubscribe : () => {};
}

export function connectToMeeting(meetingId: string): void {
  const portal = getPortalClient();
  if (typeof (portal as any).connect === 'function') {
    (portal as any).connect(roomChannel(meetingId));
  }
}

export function disconnectFromMeeting(meetingId: string): void {
  const portal = getPortalClient();
  if (typeof (portal as any).disconnect === 'function') {
    (portal as any).disconnect(roomChannel(meetingId));
  }
}
