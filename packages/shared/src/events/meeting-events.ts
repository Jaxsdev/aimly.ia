import {
  Participant,
  ChatMessage,
  BoardCard,
  BoardGroup,
  Vote,
  VoteResponse,
  Decision,
  Task,
  AgentMessage,
  AgentAction,
  MeetingSummary
} from '../types/index.js';

export type MeetingRealtimeEvent =
  | {
      type: 'participant_joined';
      payload: Participant;
    }
  | {
      type: 'participant_left';
      payload: {
        userId: string;
      };
    }
  | {
      type: 'chat_message_created';
      payload: ChatMessage;
    }
  | {
      type: 'board_card_created';
      payload: BoardCard;
    }
  | {
      type: 'board_card_updated';
      payload: BoardCard;
    }
  | {
      type: 'board_card_moved';
      payload: {
        cardId: string;
        x: number;
        y: number;
      };
    }
  | {
      type: 'board_cards_grouped';
      payload: {
        cards: BoardCard[];
        groups: BoardGroup[];
      };
    }
  | {
      type: 'vote_started';
      payload: {
        vote: Vote;
        options: any[]; // options are sent here too
      };
    }
  | {
      type: 'vote_cast';
      payload: VoteResponse;
    }
  | {
      type: 'vote_closed';
      payload: Vote;
    }
  | {
      type: 'decision_confirmed';
      payload: Decision;
    }
  | {
      type: 'tasks_created';
      payload: Task[];
    }
  | {
      type: 'agent_message';
      payload: AgentMessage;
    }
  | {
      type: 'agent_action';
      payload: AgentAction;
    }
  | {
      type: 'meeting_closed';
      payload: MeetingSummary;
    };
