import { create } from 'zustand'

type ModelStatus = 'default' | 'downloading' | 'failed' | 'complete'
type InferenceDevice = 'mps' | 'cuda' | 'cpu'

interface FolderInfo {
  path: string
  name: string
  imageCount: number
  totalSize: number
}

interface HardwareInfo {
  os: string
  inferenceDevice: InferenceDevice
  deviceName: string
  availableMemory: string
}

interface OnboardingState {
  currentStep: number
  folderInfo: FolderInfo | null
  hardwareInfo: HardwareInfo | null
  hardwareCheckComplete: boolean
  selectedModel: string
  modelStatus: ModelStatus
  downloadProgress: number
  indexingProgress: number
  indexingComplete: boolean
  onboardingComplete: boolean
}

interface OnboardingActions {
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setFolderInfo: (info: FolderInfo | null) => void
  setHardwareInfo: (info: HardwareInfo) => void
  setHardwareCheckComplete: (complete: boolean) => void
  setModelStatus: (status: ModelStatus) => void
  setDownloadProgress: (progress: number) => void
  setIndexingProgress: (progress: number) => void
  setIndexingComplete: (complete: boolean) => void
  completeOnboarding: () => void
  reset: () => void
}

const initialState: OnboardingState = {
  currentStep: 1,
  folderInfo: null,
  hardwareInfo: null,
  hardwareCheckComplete: false,
  selectedModel: 'clip-vit-b-32',
  modelStatus: 'default',
  downloadProgress: 0,
  indexingProgress: 0,
  indexingComplete: false,
  onboardingComplete: false
}

export const useOnboardingStore = create<OnboardingState & OnboardingActions>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),

  setFolderInfo: (info) => set({ folderInfo: info }),
  setHardwareInfo: (info) => set({ hardwareInfo: info }),
  setHardwareCheckComplete: (complete) => set({ hardwareCheckComplete: complete }),

  setModelStatus: (status) => set({ modelStatus: status }),
  setDownloadProgress: (progress) => set({ downloadProgress: progress }),

  setIndexingProgress: (progress) => set({ indexingProgress: progress }),
  setIndexingComplete: (complete) => set({ indexingComplete: complete }),

  completeOnboarding: () => set({ onboardingComplete: true }),
  reset: () => set(initialState)
}))

export type { FolderInfo, HardwareInfo, ModelStatus, InferenceDevice }
