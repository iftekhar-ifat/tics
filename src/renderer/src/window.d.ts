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
      getDataDir: () => Promise<string>
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
      openFolder: (path: string) => Promise<void>
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
      getFolderInfo: () => Promise<{ path: string; size: number }>
      moveFolder: (newDir: string) => Promise<{ path: string; size: number }>
      deleteModelFolder: () => Promise<void>
      adoptModelFolder: (modelFolderPath: string) => Promise<{ path: string; size: number }>
    }
    folderWatcher: {
      start: (rootPath: string) => Promise<{ ok: boolean; message?: string }>
      stop: () => Promise<{ ok: boolean }>
      onUpdate: (callback: (data: { imageCount: number; totalSize: number }) => void) => () => void
    }
    indexing: {
      start: (
        rootPath: string,
        totalImages: number,
        indexedSoFar?: number
      ) => Promise<{
        ok: boolean
        data?: { status: string; imageCount?: number }
        message?: string
      }>
      getStatus: (rootPath?: string) => Promise<{
        ok: boolean
        data?: {
          state: 'idle' | 'running' | 'paused' | 'complete'
          indexed: number
        }
        message?: string
      }>
      cancel: () => Promise<{
        ok: boolean
        data?: { status: string }
        message?: string
      }>
      clear: (rootPath: string) => Promise<{
        ok: boolean
        data?: { status: string }
        message?: string
      }>
    }
    search: {
      query: (params: {
        text?: string
        imagePath?: string
        rootPath: string
        topK?: number
      }) => Promise<{
        ok: boolean
        data?: { results: { path: string; name: string; score: number }[] }
        message?: string
      }>
    }
    file: {
      openItem: (path: string) => Promise<void>
      readFile: (filePath: string) => Promise<Uint8Array>
      copyToRoot: (rootPath: string, fileName: string, data: ArrayBuffer) => Promise<{ ok: boolean; path?: string; message?: string }>
    }
  }
}
