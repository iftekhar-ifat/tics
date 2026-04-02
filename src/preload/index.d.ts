declare global {
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

  interface Window {
    api: {
      app: {
        getVersion: () => Promise<string>
      }
      folder: {
        scanFolder: (dirPath: string) => Promise<{ imageCount: number; totalSize: number }>
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
        getHttpStatus: () => Promise<HttpStatusResponse>
        onStatusChanged: (callback: (state: BackendStatus) => void) => () => void
      }
    }
  }
}
