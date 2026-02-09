import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  isOrganiser: boolean;
  isAdmin?: boolean;
  profilePicture?: string | null;
}

interface AuthStore {
  user: User | null;
  login: (user: User, remember?: boolean) => void;
  logout: () => void;
  updateProfilePicture: (profilePicture: string | null) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      login: (user, remember = false) => {
        set({ user });
        if (typeof window !== 'undefined') {
          // Clear previous account's chat history on login
          localStorage.removeItem('chat-storage');
          if (!remember) {
            const data = JSON.stringify({ state: { user }, version: 0 });
            sessionStorage.setItem('auth-storage-session', data);
          }
        }
      },
      logout: () => {
        set({ user: null });
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth-storage-session');
          // Clear chat history on logout
          localStorage.removeItem('chat-storage');
        }
      },
      updateProfilePicture: (profilePicture) => {
        set((state) => ({
          user: state.user ? { ...state.user, profilePicture } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
