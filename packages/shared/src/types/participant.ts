export type ParticipantRole = 'host' | 'participant';

export interface Profile {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  meetingId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
  profile?: Profile;
}
