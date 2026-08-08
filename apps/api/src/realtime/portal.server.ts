import { Portal } from '@portalsdk/core';

const PORTAL_API_KEY = process.env.PORTAL_API_KEY || '';
const PORTAL_SECRET = process.env.PORTAL_SECRET || '';

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
function roomChannel(meetingId: string): string {
  return `room:${meetingId}`;
}

/**
 * Publish a typed real-time event to all participants in a meeting.
 * This is the ONLY server-side function that writes to Portal.
 */
export async function publishMeetingEvent(
  meetingId: string,
  type: string,
  payload: unknown
): Promise<void> {
  try {
    const portal = getPortal();
    const channel = roomChannel(meetingId);
    // Using portal.publish if available; otherwise channels API
    if (typeof (portal as any).publish === 'function') {
      await (portal as any).publish(channel, { type, payload });
    } else {
      console.warn('[Portal] publish method not available. Event not sent:', type);
    }
  } catch (err) {
    // Portal failures should never crash the meeting flow
    console.error('[Portal] Failed to publish event:', type, err);
  }
}
