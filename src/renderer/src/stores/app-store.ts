import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  onboardingComplete: boolean
  appReady: boolean
  setOnboardingComplete: (complete: boolean) => void
  setAppReady: (ready: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      appReady: false,
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      setAppReady: (ready) => set({ appReady: ready })
    }),
    {
      name: 'tics-app-state',
      partialize: (state) => ({ onboardingComplete: state.onboardingComplete })
    }
  )
)
