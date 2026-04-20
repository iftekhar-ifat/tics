import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface RootFolder {
  path: string
  name: string
  imageCount: number
}

interface AppState {
  onboardingComplete: boolean
  appReady: boolean
  rootFolder: RootFolder | null
  setOnboardingComplete: (complete: boolean) => void
  setAppReady: (ready: boolean) => void
  setRootFolder: (folder: RootFolder | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      onboardingComplete: false,
      appReady: false,
      rootFolder: null,
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      setAppReady: (ready) => set({ appReady: ready }),
      setRootFolder: (folder) => set({ rootFolder: folder })
    }),
    {
      name: 'tics-app-state',
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        rootFolder: state.rootFolder
      })
    }
  )
)
