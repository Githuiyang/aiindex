import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAdmin: boolean;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAdmin: false,
      login: () => set({ isAdmin: true }),
      logout: () => set({ isAdmin: false }),
    }),
    {
      name: 'aiindex-auth',
    }
  )
);
