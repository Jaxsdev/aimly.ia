export type VoteStatus = 'open' | 'closed';

export interface Vote {
  id: string;
  meetingId: string;
  question: string;
  status: VoteStatus;
  createdBy: string;
  createdAt: string;
  closedAt: string | null;
}

export interface VoteOption {
  id: string;
  voteId: string;
  label: string;
  sortOrder: number;
}

export interface VoteResponse {
  id: string;
  voteId: string;
  optionId: string;
  userId: string;
  createdAt: string;
}
