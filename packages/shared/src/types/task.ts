export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  meetingId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  status: TaskStatus;
  sourceDecisionId: string | null;
  createdAt: string;
  updatedAt: string;
}
