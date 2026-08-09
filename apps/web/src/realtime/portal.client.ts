import { Portal } from '@portalsdk/core';
import type { MeetingRealtimeEvent } from '@aimly/shared';

let portalInstance: Portal | null = null;

export function getPortalClient(): Portal {
  if (!portalInstance) {
    const apiKey = (import.meta.env.VITE_PORTAL_PUBLIC_KEY as string) || '';
    portalInstance = new Portal({ apiKey });
  }
  return portalInstance;
}

export function roomChannel(meetingId: string): string {
  return `room:${meetingId}`;
}

/**
 * Subscribe to a meeting channel in Portal and receive typed events.
 */
export function subscribeToMeeting(
  meetingId: string,
  onEvent: (event: MeetingRealtimeEvent) => void
): () => void {
  const portal = getPortalClient();
  const channelName = roomChannel(meetingId);
  const channel = portal.channel<MeetingRealtimeEvent>(channelName);

  channel.acquire();

  const unsubscribe = channel.on('message', (msg: any) => {
    try {
      if (msg?.content) {
        onEvent(msg.content as MeetingRealtimeEvent);
      }
    } catch (err) {
      console.error('[Portal Client] Failed to handle message:', err);
    }
  });

  return () => {
    unsubscribe();
    channel.release();
  };
}

export function sendPortalEvent(meetingId: string, event: MeetingRealtimeEvent): void {
  const portal = getPortalClient();
  const channelName = roomChannel(meetingId);
  const channel = portal.channel(channelName);
  channel.acquire();
  channel.send({ content: event }).finally(() => channel.release());
}
