export interface AgentMessage {
  id: string;
  meetingId: string;
  text: string;
  createdAt: string;
}

export type AgentActionType = 'none' | 'ask_question' | 'propose_vote';

export interface AgentAction {
  type: AgentActionType;
  message?: string;
  question?: string;
  options?: string[];
  criteria?: string[];
}

export interface AgentEvent {
  id: string;
  meetingId: string;
  type: string;
  summary: string;
  payload: any;
  createdAt: string;
}

export interface AimLyAnalysis {
  summary: string;
  observations: string[];
  groups: {
    title: string;
    cardIds: string[];
  }[];
  suggestedAction: AgentAction;
}

export interface MeetingSummary {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  nextSteps: string[];
}
