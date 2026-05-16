import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { HardwareInfo, ModelStatus } from './onboarding-store'

interface RootFolder {
  path: string
  name: string
}

interface FolderStats {
  imageCount: number
  totalSize: number
}

interface ModelFolder {
  path: string
  size: number
}

interface AppState {
  // Onboarding workflow state
  onboardingComplete: boolean
  currentStep: number
  rootFolder: RootFolder | null
  folderStats: FolderStats
  modelFolder: ModelFolder | null
  hardwareInfo: HardwareInfo | null
  hardwareCheckComplete: boolean
  selectedModel: string
  modelStatus: ModelStatus
  downloadProgress: number
  indexingProgress: number
  indexingComplete: boolean

  // App runtime state
  appReady: boolean
  newImagesCount: number

  // Actions
  setOnboardingComplete: (complete: boolean) => void
  setCurrentStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setRootFolder: (info: RootFolder | null) => void
  setFolderStats: (stats: FolderStats) => void
  setModelFolder: (info: ModelFolder | null) => void
  setHardwareInfo: (info: HardwareInfo | null) => void
  setHardwareCheckComplete: (complete: boolean) => void
  setModelStatus: (status: ModelStatus) => void
  setDownloadProgress: (progress: number) => void
  setIndexingProgress: (progress: number) => void
  setIndexingComplete: (complete: boolean) => void
  setSelectedModel: (model: string) => void
  setAppReady: (ready: boolean) => void
  setNewImagesCount: (count: number) => void
  resetOnboarding: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Onboarding workflow state
      onboardingComplete: false,
      currentStep: 1,
      rootFolder: null,
      folderStats: { imageCount: 0, totalSize: 0 },
      modelFolder: null,
      hardwareInfo: null,
      hardwareCheckComplete: false,
      selectedModel: 'clip-vit-b-32',
      modelStatus: 'default' as ModelStatus,
      downloadProgress: 0,
      indexingProgress: 0,
      indexingComplete: false,

      // App runtime state
      appReady: false,
      newImagesCount: 0,

      // Actions
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
      prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
      setRootFolder: (info) => set({ rootFolder: info }),
      setFolderStats: (stats) => set({ folderStats: stats }),
      setModelFolder: (info) => set({ modelFolder: info }),
      setHardwareInfo: (info) => set({ hardwareInfo: info }),
      setHardwareCheckComplete: (complete) => set({ hardwareCheckComplete: complete }),
      setModelStatus: (status) => set({ modelStatus: status }),
      setDownloadProgress: (progress) => set({ downloadProgress: progress }),
      setIndexingProgress: (progress) => set({ indexingProgress: progress }),
      setIndexingComplete: (complete) => set({ indexingComplete: complete }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setAppReady: (ready) => set({ appReady: ready }),
      setNewImagesCount: (count) => set({ newImagesCount: count }),
      resetOnboarding: () =>
        set({
          onboardingComplete: false,
          currentStep: 1,
          rootFolder: null,
          modelFolder: null,
          hardwareInfo: null,
          hardwareCheckComplete: false,
          selectedModel: 'clip-vit-b-32',
          modelStatus: 'default',
          downloadProgress: 0,
          indexingProgress: 0,
          indexingComplete: false
        })
    }),
    {
      name: 'tics-app-state',
      partialize: (state) => ({
        onboardingComplete: state.onboardingComplete,
        currentStep: state.currentStep,
        rootFolder: state.rootFolder
          ? { path: state.rootFolder.path, name: state.rootFolder.name }
          : null,
        modelFolder: state.modelFolder,
        hardwareInfo: state.hardwareInfo,
        hardwareCheckComplete: state.hardwareCheckComplete,
        selectedModel: state.selectedModel,
        modelStatus: state.modelStatus,
        downloadProgress: state.downloadProgress,
        indexingProgress: state.indexingProgress,
        indexingComplete: state.indexingComplete
      })
    }
  )
)
