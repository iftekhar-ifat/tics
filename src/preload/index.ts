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

const api = {
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
