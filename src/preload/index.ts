import { contextBridge, ipcRenderer } from 'electron'

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
  url: string | null
}

type HttpStatusResponse = {
  ok: boolean
  data?: {
    status: string
    uptime: string
    connected_clients: number
    random_value: number
  }
  message?: string
}

const api = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version') as Promise<string>
  },
  dialog: {
    openDirectory: () =>
      ipcRenderer.invoke('dialog:open-directory') as Promise<Electron.OpenDialogReturnValue>
  },
  folder: {
    scanFolder: (dirPath: string) =>
      ipcRenderer.invoke('folder:scan', dirPath) as Promise<{
        imageCount: number
        totalSize: number
      }>
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
    getHttpStatus: () =>
      ipcRenderer.invoke('backend:get-http-status') as Promise<HttpStatusResponse>,
    onStatusChanged: (callback: (state: BackendStatus) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: BackendStatus): void => {
        callback(state)
      }
      ipcRenderer.on('backend:status-changed', listener)
      return () => ipcRenderer.removeListener('backend:status-changed', listener)
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
      }>
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
