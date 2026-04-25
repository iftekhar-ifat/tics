import { create } from 'zustand'
import { useAppStore } from './app-store'

export interface FolderInfo {
  path: string
  name: string
  imageCount: number
  totalSize: number
}

export type InferenceDevice = 'mps' | 'cuda' | 'cpu'
export type ModelStatus = 'default' | 'downloading' | 'failed' | 'complete'

export interface HardwareInfo {
  os: string
  inferenceDevice: InferenceDevice
  deviceName: string
  availableMemory: string
}

interface OnboardingActions {
  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setFolderInfo: (info: FolderInfo | null) => void
  setHardwareInfo: (info: HardwareInfo | null) => void
  setHardwareCheckComplete: (complete: boolean) => void
  setModelStatus: (status: ModelStatus) => void
  setDownloadProgress: (progress: number) => void
  setIndexingProgress: (progress: number) => void
  setIndexingComplete: (complete: boolean) => void
  completeOnboarding: () => void
  reset: () => void
  detectHardware: () => Promise<void>
}

export const useOnboardingStore = create<OnboardingActions>()(() => ({
  setStep: (step) => useAppStore.setState({ currentStep: step }),
  nextStep: () =>
    useAppStore.setState((state) => ({
      currentStep: Math.min((state.currentStep || 1) + 1, 4)
    })),
  prevStep: () =>
    useAppStore.setState((state) => ({
      currentStep: Math.max((state.currentStep || 1) - 1, 1)
    })),

  setFolderInfo: (info) => useAppStore.setState({ rootFolder: info }),
  setHardwareInfo: (info) => useAppStore.setState({ hardwareInfo: info }),
  setHardwareCheckComplete: (complete) => useAppStore.setState({ hardwareCheckComplete: complete }),

  setModelStatus: (status) => useAppStore.setState({ modelStatus: status }),
  setDownloadProgress: (progress) => useAppStore.setState({ downloadProgress: progress }),

  setIndexingProgress: (progress) => useAppStore.setState({ indexingProgress: progress }),
  setIndexingComplete: (complete) => useAppStore.setState({ indexingComplete: complete }),

  completeOnboarding: () => useAppStore.setState({ onboardingComplete: true }),
  reset: () => useAppStore.getState().resetOnboarding(),
  detectHardware: async () => {
    const osInfo = (await window.api.system.getOSInfo?.()) ?? {
      os: 'Windows 11',
      device: 'cuda',
      deviceName: 'NVIDIA RTX 3080',
      memory: '32 GB'
    }
    const hwInfo: HardwareInfo = {
      os: osInfo.os,
      inferenceDevice: osInfo.device as InferenceDevice,
      deviceName: osInfo.deviceName,
      availableMemory: osInfo.memory
    }
    useAppStore.setState({ hardwareInfo: hwInfo, hardwareCheckComplete: true })
  }
}))
