import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
 
interface AuthState {
  session: Session | null
  setSession: (session: Session | null) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  loginAttempts: number
  incrementLoginAttempts: () => void
  resetLoginAttempts: () => void
}
 
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
  loginAttempts: 0,
  incrementLoginAttempts: () =>
    set((state) => ({ loginAttempts: state.loginAttempts + 1 })),
  resetLoginAttempts: () => set({ loginAttempts: 0 }),
}))