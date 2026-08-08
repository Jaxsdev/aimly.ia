export type MeetingStatus = 'draft' | 'active' | 'closed';

export interface Meeting {
  id: string;
  title: string;
  objective: string;
  expectedOutcome: string;
  status: MeetingStatus;
  hostId: string;
  durationMinutes: number;
  startedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
