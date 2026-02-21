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
  content: string;
  seq: number;
  createdAt: string;
}

interface SessionsState {
  sessions: Session[];
  currentSession: Session | null;
  messages: Message[];
  isLoading: boolean;

  // Actions
  fetchSessions: () => Promise<void>;
  fetchSession: (id: string) => Promise<void>;
  fetchMessages: (sessionId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  setCurrentSession: (session: Session | null) => void;
}

export const useSessionsStore = create<SessionsState>((set, get) => ({
  sessions: [],
  currentSession: null,
  messages: [],
  isLoading: false,

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
}));

// Setup socket listeners
socketClient.on('session:event', (data: any) => {
  const { message } = data;
  if (message) {
    useSessionsStore.getState().addMessage(message);
  }
});
