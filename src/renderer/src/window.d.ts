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

interface Window {
  api: {
    updater: {
      getState: () => Promise<UpdateState>
      checkForUpdates: () => Promise<{ ok: boolean; message?: string }>
      downloadUpdate: () => Promise<{ ok: boolean; message?: string }>
      quitAndInstall: () => Promise<void>
      onStateChanged: (callback: (state: UpdateState) => void) => () => void
    }
  }
}
