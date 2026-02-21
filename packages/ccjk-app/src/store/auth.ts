import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../api/client';
import { socketClient } from '../api/socket';

/**
 * Auth store
 */

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (token: string, user: User) => void;
  logout: () => void;
  verifyToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(persist(
  (set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,

    login: (token: string, user: User) => {
      apiClient.setToken(token);
      socketClient.connect(token);
      set({ token, user, isAuthenticated: true });
    },

    logout: () => {
      apiClient.clearToken();
      socketClient.disconnect();
      set({ token: null, user: null, isAuthenticated: false });
    },

    verifyToken: async () => {
      const { token } = get();
      if (!token) return false;

      try {
        set({ isLoading: true });
        apiClient.setToken(token);
        const { user } = await apiClient.verifyToken();
        socketClient.connect(token);
        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      } catch (error) {
        console.error('Token verification failed:', error);
        get().logout();
        set({ isLoading: false });
        return false;
      }
    },
  }),
  {
    name: 'auth-storage',
    storage: createJSONStorage(() => AsyncStorage),
  }
));
