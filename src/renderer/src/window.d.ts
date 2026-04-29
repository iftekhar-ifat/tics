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

interface Window {
  api: {
    app: {
      getVersion: () => Promise<string>
    }
    dialog: {
      openDirectory: () => Promise<{ canceled: boolean; filePaths: string[] }>
    }
    folder: {
      scanFolder: (dirPath: string) => Promise<{ imageCount: number; totalSize: number }>
      listSubdirectories: (dirPath: string) => Promise<{ name: string; path: string }[]>
      getAllImages: (
        dirPath: string
      ) => Promise<{ name: string; path: string; relativePath: string }[]>
    }
    system: {
      getOSInfo: () => Promise<{
        os: string
        device: string
        deviceName: string
        memory: string
      }>
    }
    updater: {
      getState: () => Promise<UpdateState>
      checkForUpdates: () => Promise<{ ok: boolean; message?: string }>
      downloadUpdate: () => Promise<{ ok: boolean; message?: string }>
      quitAndInstall: () => Promise<void>
      onStateChanged: (callback: (state: UpdateState) => void) => () => void
    }
    backend: {
      getStatus: () => Promise<BackendStatus>
      onStatusChanged: (callback: (state: BackendStatus) => void) => () => void
      onEvent: (callback: (event: { type: string; data: unknown }) => void) => () => void
    }
    model: {
      getStatus: () => Promise<{
        ok: boolean
        data?: { ready: boolean; device: string }
        message?: string
      }>
      download: () => Promise<{
        ok: boolean
        data?: { status: string }
        message?: string
      }>
      cancelDownload: () => Promise<{
        ok: boolean
        data?: { status: string }
        message?: string
      }>
      getFolderInfo: () => Promise<{
        ok: boolean
        data?: { path: string; size: number }
        message?: string
      }>
      moveFolder: (newDir: string) => Promise<{
        ok: boolean
        data?: { path: string; size: number }
        message?: string
      }>
    }
    file: {
      openItem: (path: string) => Promise<void>
    }
  }
}
