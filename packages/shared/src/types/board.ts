export type BoardCardType = 'idea';

export interface BoardCard {
  id: string;
  meetingId: string;
  text: string;
  type: BoardCardType;
  x: number;
  y: number;
  groupId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardGroup {
  id: string;
  meetingId: string;
  title: string;
  createdByAgent: boolean;
  createdAt: string;
}
