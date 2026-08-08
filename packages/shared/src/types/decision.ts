export interface Decision {
  id: string;
  meetingId: string;
  text: string;
  sourceVoteId: string | null;
  confirmedBy: string;
  createdAt: string;
}
