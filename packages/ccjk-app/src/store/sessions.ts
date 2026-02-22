import { create } from 'zustand';
import { apiClient } from '../api/client';
import { socketClient } from '../api/socket';

/**
 * Sessions store
 */

interface Session {
  id: string;
  tag: string;
  metadata: string;
  agentState: string | null;
  active: boolean;
  lastActivityAt: string;
  machine: {
    id: string;
    hostname: string;
    platform: string;
  };
}

interface Message {
  id: string;
  sessionId: string;
  envelope: {
    nonce: string;
    ciphertext: string;
  };
  seq: number;
  createdAt: string;
}

interface DecryptedEvent {
  t: string;
  [key: string]: any;
}

interface SessionsState {
  sessions: Session[];
  currentSession: Session | null;
  messages: Message[];
  isLoading: boolean;
  sessionKey: Uint8Array | null;
  toolCalls: Map<string, any>;

  // Actions
  fetchSessions: () => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  fetchMessages: (sessionId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  setCurrentSession: (session: Session | null) => void;
  setSessionKey: (key: Uint8Array | null) => void;
  updateToolCall: (callId: string, data: any) => void;
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,
  sessionKey: null,
  toolCalls: new Map(),

  fetchSessions: async () => {
    try {
      set({ isLoading: true });
      const { sessions } = await apiClient.getSessions();
      set({ sessions, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      set({ isLoading: false });
    }
  },

  fetchSession: async (id: string) => {
    try {
      set({ isLoading: true });
      const { session } = await apiClient.getSession(id);
      set({ currentSession: session, isLoading: false });

      // Join session room
      socketClient.joinSession(id);
    } catch (error) {
      console.error('Failed to fetch session:', error);
      set({ isLoading: false });
    }
  },

  fetchMessages: async (sessionId: string) => {
    try {
      const { messages } = await apiClient.getSessionMessages(sessionId);
      set({ messages });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setCurrentSession: (session: Session | null) => {
    const { currentSession } = get();

    // Leave previous session room
    if (currentSession) {
      socketClient.leaveSession(currentSession.id);
    }

    // Join new session room
    if (session) {
      socketClient.joinSession(session.id);
    }

    set({ currentSession: session });
  },

  setSessionKey: (key: Uint8Array | null) => {
    set({ sessionKey: key });
  },

  updateToolCall: (callId: string, data: any) => {
    set((state) => {
      const toolCalls = new Map(state.toolCalls);
      toolCalls.set(callId, { ...toolCalls.get(callId), ...data });
      return { toolCalls };
    });
  },
}));

// Setup socket listeners
socketClient.on('session:event', (data: any) => {
  const { message } = data;
  if (message) {
    useSessionsStore.getState().addMessage(message);
  }
});
