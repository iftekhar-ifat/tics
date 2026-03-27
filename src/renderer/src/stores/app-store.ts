import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  onboardingComplete: boolean
  setOnboardingComplete: (complete: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete })
    }),
    {
      name: 'tics-app-state'
    }
  )
)
