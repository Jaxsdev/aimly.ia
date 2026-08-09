import { Portal } from '@portalsdk/core';

const PORTAL_API_KEY = process.env.PORTAL_API_KEY || '';

let portalInstance: Portal | null = null;

function getPortal(): Portal {
  if (!portalInstance) {
    portalInstance = new Portal({ apiKey: PORTAL_API_KEY });
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
 * Publish a typed real-time event to all participants in a meeting using Portal SDK.
 */
export async function publishMeetingEvent(
  meetingId: string,
  type: string,
  payload: unknown
): Promise<void> {
  try {
    const portal = getPortal();
    const channelName = roomChannel(meetingId);
    const ch = portal.channel(channelName);
    ch.acquire();
    await ch.send({ content: { type, payload } });
    ch.release();
    console.log(`[Portal Server] Published event ${type} to ${channelName}`);
  } catch (err) {
    console.error('[Portal Server] Failed to publish event:', type, err);
  }
}
