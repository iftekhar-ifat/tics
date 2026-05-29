import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Search Defaults
  topK: number
  fusionWeight: number
  sortOrder: 'similarity' | 'newest' | 'oldest'

  // Indexing
  watcherPaused: boolean
  indexedExtensions: {
    jpg: boolean
    jpeg: boolean
    png: boolean
    webp: boolean
    heic: boolean
    gif: boolean
    tiff: boolean
  }
  skipHiddenFolders: boolean

  // Actions
  setTopK: (k: number) => void
  setFusionWeight: (weight: number) => void
  setSortOrder: (order: 'similarity' | 'newest' | 'oldest') => void
  setWatcherPaused: (paused: boolean) => void
  setIndexedExtension: (ext: keyof SettingsState['indexedExtensions'], enabled: boolean) => void
  setSkipHiddenFolders: (skip: boolean) => void
  resetToDefaults: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Search Defaults
      topK: 50,
      fusionWeight: 50,
      sortOrder: 'similarity' as const,

      // Indexing
      watcherPaused: false,
      indexedExtensions: {
        jpg: true,
        jpeg: true,
        png: true,
        webp: true,
        heic: true,
        gif: true,
        tiff: true
      },
      skipHiddenFolders: false,

      // Actions
      setTopK: (k: number) => set({ topK: k }),
      setFusionWeight: (weight) => set({ fusionWeight: weight }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setWatcherPaused: (paused) => set({ watcherPaused: paused }),
      setIndexedExtension: (ext, enabled) =>
        set((state) => ({
          indexedExtensions: {
            ...state.indexedExtensions,
            [ext]: enabled
          }
        })),
      setSkipHiddenFolders: (skip) => set({ skipHiddenFolders: skip }),
      resetToDefaults: () =>
        set({
          topK: 50,
          fusionWeight: 50,
          sortOrder: 'similarity',
          watcherPaused: false,
          indexedExtensions: {
            jpg: true,
            jpeg: true,
            png: true,
            webp: true,
            heic: true,
            gif: true,
            tiff: true
          },
          skipHiddenFolders: false
        })
    }),
    {
      name: 'tics-settings'
    }
  )
)
