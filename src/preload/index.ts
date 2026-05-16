import { contextBridge, ipcRenderer } from 'electron'
import { scanFolder } from './utils/file-scanner'
import {
  getModelFolderInfo,
  moveModelFolder,
  deleteModelFolder,
  adoptModelFolder
} from './utils/model-utils'

type UpdateState = {
  status:
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error'
  version?: string
  downloadedVersion?: string
  progressPercent?: number
  message?: string
}

type BackendStatus = {
  status: 'starting' | 'running' | 'stopped' | 'error'
}

const api = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version') as Promise<string>,
    getDataDir: () => ipcRenderer.invoke('app:get-data-dir') as Promise<string>
  },
  dialog: {
    openDirectory: () =>
      ipcRenderer.invoke('dialog:open-directory') as Promise<Electron.OpenDialogReturnValue>
  },
  folder: {
    scanFolder: (dirPath: string) => scanFolder(dirPath),
    listSubdirectories: (dirPath: string) =>
      ipcRenderer.invoke('folder:list-subdirs', dirPath) as Promise<
        { name: string; path: string }[]
      >,
    getAllImages: (dirPath: string) =>
      ipcRenderer.invoke('folder:get-all-images', dirPath) as Promise<
        { name: string; path: string; relativePath: string }[]
      >,
    openFolder: (path: string) => ipcRenderer.invoke('folder:open-folder', path)
  },
  system: {
    getOSInfo: () =>
      ipcRenderer.invoke('system:get-os-info') as Promise<{
        os: string
        device: string
        deviceName: string
        memory: string
      }>
  },
  updater: {
    getState: () => ipcRenderer.invoke('updater:get-state') as Promise<UpdateState>,
    checkForUpdates: () =>
      ipcRenderer.invoke('updater:check') as Promise<{ ok: boolean; message?: string }>,
    downloadUpdate: () =>
      ipcRenderer.invoke('updater:download') as Promise<{ ok: boolean; message?: string }>,
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install') as Promise<void>,
    onStateChanged: (callback: (state: UpdateState) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: UpdateState): void => {
        callback(state)
      }
      ipcRenderer.on('updater:state-changed', listener)
      return () => ipcRenderer.removeListener('updater:state-changed', listener)
    }
  },
  backend: {
    getStatus: () => ipcRenderer.invoke('backend:get-status') as Promise<BackendStatus>,
    onStatusChanged: (callback: (state: BackendStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: BackendStatus): void => {
        callback(state)
      }
      ipcRenderer.on('backend:status-changed', listener)
      return () => ipcRenderer.removeListener('backend:status-changed', listener)
    },
    onEvent: (callback: (event: { type: string; data: unknown }) => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        ev: { type: string; data: unknown }
      ): void => {
        callback(ev)
      }
      ipcRenderer.on('backend:event', listener)
      return () => ipcRenderer.removeListener('backend:event', listener)
    }
  },
  model: {
    getStatus: () =>
      ipcRenderer.invoke('model:get-status') as Promise<{
        ok: boolean
        data?: { ready: boolean; device: string }
        message?: string
      }>,
    download: () =>
      ipcRenderer.invoke('model:download') as Promise<{
        ok: boolean
        data?: { status: string }
        message?: string
      }>,
    cancelDownload: () =>
      ipcRenderer.invoke('model:cancel-download') as Promise<{
        ok: boolean
        data?: { status: string }
        message?: string
      }>,
    getFolderInfo: () => getModelFolderInfo(),
    moveFolder: (newDir: string) => moveModelFolder(newDir),
    deleteModelFolder: () => deleteModelFolder(),
    adoptModelFolder: (modelFolderPath: string) => adoptModelFolder(modelFolderPath)
  },
  watcher: {
    start: (rootPath: string) =>
      ipcRenderer.invoke('watcher:start', rootPath) as Promise<{ ok: boolean; message?: string }>,
    stop: () => ipcRenderer.invoke('watcher:stop') as Promise<{ ok: boolean }>,
    getStatus: () =>
      ipcRenderer.invoke('watcher:get-status') as Promise<{ watching: boolean; rootPath: string }>
  },
  folderWatcher: {
    start: (rootPath: string) =>
      ipcRenderer.invoke('folder-watcher:start', rootPath) as Promise<{
        ok: boolean
        message?: string
      }>,
    stop: () => ipcRenderer.invoke('folder-watcher:stop') as Promise<{ ok: boolean }>,
    onUpdate: (callback: (data: { imageCount: number; totalSize: number }) => void) => {
      const handler = (_event: unknown, data: { imageCount: number; totalSize: number }) =>
        callback(data)
      ipcRenderer.on('folder-watcher:update', handler)
      return () => ipcRenderer.removeListener('folder-watcher:update', handler)
    }
  },
  indexing: {
    start: (rootPath: string, totalImages: number, indexedSoFar: number = 0) =>
      ipcRenderer.invoke('indexing:start', rootPath, totalImages, indexedSoFar) as Promise<{
        ok: boolean
        data?: { status: string }
        message?: string
      }>,
    getStatus: () =>
      ipcRenderer.invoke('indexing:get-status') as Promise<{
        ok: boolean
        data?: {
          state: 'idle' | 'running' | 'paused' | 'complete'
          indexed: number
          total: number
        }
        message?: string
      }>,
    cancel: () =>
      ipcRenderer.invoke('indexing:cancel') as Promise<{
        ok: boolean
        data?: { status: string }
        message?: string
      }>,
    clear: (rootPath: string) =>
      ipcRenderer.invoke('indexing:clear', rootPath) as Promise<{
        ok: boolean
        data?: { status: string }
        message?: string
      }>
  },
  file: {
    openItem: (path: string) => ipcRenderer.invoke('file:open-item', path) as Promise<void>
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error bridge fallback for disabled context isolation
  window.api = api
}
