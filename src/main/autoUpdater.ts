import { autoUpdater } from 'electron-updater'
import { setUpdateState } from './state'

export function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    setUpdateState({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    setUpdateState({
      status: 'available',
      version: info.version
    })
  })

  autoUpdater.on('update-not-available', () => {
    setUpdateState({ status: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    setUpdateState({
      status: 'downloading',
      progressPercent: progress.percent
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({
      status: 'downloaded',
      downloadedVersion: info.version
    })
  })

  autoUpdater.on('error', (err) => {
    setUpdateState({
      status: 'error',
      message: err.message
    })
  })
}

export function checkForUpdates(): void {
  if (process.env.NODE_ENV === 'development') {
    return
  }
  void autoUpdater.checkForUpdates().catch(() => {
    setUpdateState({ status: 'error', message: 'Silent update check failed' })
  })
}