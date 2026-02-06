import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  isOrganiser: boolean;
}

interface AuthStore {
  user: User | null;
  login: (user: User, remember?: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      login: (user, remember = false) => {
        set({ user });
        // If "remember me" is not checked, store in sessionStorage instead
        if (!remember && typeof window !== 'undefined') {
          // Move data to sessionStorage
          const data = JSON.stringify({ state: { user }, version: 0 });
          sessionStorage.setItem('auth-storage-session', data);
        }
      },
      logout: () => {
        set({ user: null });
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('auth-storage-session');
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
