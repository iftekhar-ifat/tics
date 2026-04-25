import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HardwareInfo, ModelStatus } from './onboarding-store'

interface RootFolder {
  path: string
  name: string
  imageCount: number
  totalSize: number
}

interface AppState {
  // Onboarding workflow state
  onboardingComplete: boolean
  currentStep: number
  rootFolder: RootFolder | null
  hardwareInfo: HardwareInfo | null
  hardwareCheckComplete: boolean
  selectedModel: string
  modelStatus: ModelStatus
  downloadProgress: number
  indexingProgress: number
  indexingComplete: boolean

  // App runtime state
  appReady: boolean

  // Actions
  setOnboardingComplete: (complete: boolean) => void
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setRootFolder: (info: RootFolder | null) => void
  setHardwareInfo: (info: HardwareInfo | null) => void
  setHardwareCheckComplete: (complete: boolean) => void
  setModelStatus: (status: ModelStatus) => void
  setDownloadProgress: (progress: number) => void
  setIndexingProgress: (progress: number) => void
  setIndexingComplete: (complete: boolean) => void
  setSelectedModel: (model: string) => void
  setAppReady: (ready: boolean) => void
  resetOnboarding: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Onboarding workflow state
      onboardingComplete: false,
      currentStep: 1,
      rootFolder: null,
      hardwareInfo: null,
      hardwareCheckComplete: false,
      selectedModel: 'clip-vit-b-32',
      modelStatus: 'default' as ModelStatus,
      downloadProgress: 0,
      indexingProgress: 0,
      indexingComplete: false,

      // App runtime state
      appReady: false,

      // Actions
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      setRootFolder: (info) => set({ rootFolder: info }),
      setHardwareInfo: (info) => set({ hardwareInfo: info }),
      setHardwareCheckComplete: (complete) => set({ hardwareCheckComplete: complete }),
      setModelStatus: (status) => set({ modelStatus: status }),
      setDownloadProgress: (progress) => set({ downloadProgress: progress }),
      setIndexingProgress: (progress) => set({ indexingProgress: progress }),
      setIndexingComplete: (complete) => set({ indexingComplete: complete }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setAppReady: (ready) => set({ appReady: ready }),
      resetOnboarding: () =>
        set({
          onboardingComplete: false,
          currentStep: 1,
          rootFolder: null,
          hardwareInfo: null,
          hardwareCheckComplete: false,
          selectedModel: 'clip-vit-b-32',
          modelStatus: 'default',
          downloadProgress: 0,
          indexingProgress: 0,
          indexingComplete: false,
        }),
    }),
    {
      name: 'tics-app-state',
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        currentStep: state.currentStep,
        rootFolder: state.rootFolder,
        hardwareInfo: state.hardwareInfo,
        hardwareCheckComplete: state.hardwareCheckComplete,
        selectedModel: state.selectedModel,
        modelStatus: state.modelStatus,
        downloadProgress: state.downloadProgress,
        indexingProgress: state.indexingProgress,
        indexingComplete: state.indexingComplete,
      }),
    }
  )
)
