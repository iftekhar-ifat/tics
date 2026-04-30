import { app } from 'electron'
import { is } from '@electron-toolkit/utils'

import { setBackendStatusCallback, setUpdateStateCallback, getMainWindow } from './state'
import { startBackend, stopBackend } from './backend'
import { loadConfig, getDataDir } from './config'
import { createWindow, setupElectronApp, setupWindowShortcuts } from './window'
import { setupAutoUpdater, checkForUpdates } from './autoUpdater'
import { registerIpcHandlers } from './ipcHandlers'

loadConfig()

const currentDataDir = getDataDir()

// App lifecycle
app.whenReady().then(() => {
  // Set up Electron app features
  setupElectronApp()
  setupWindowShortcuts()

  // Set up auto-updater listeners
  setupAutoUpdater()

  // Register IPC handlers
  registerIpcHandlers()

  // Wire state change callbacks to forward events to renderer
  setBackendStatusCallback((status) => {
    const mainWin = getMainWindow()
    if (mainWin) {
      mainWin.webContents.send('backend:status-changed', { status })
    }
  })

  setUpdateStateCallback((state) => {
    const mainWin = getMainWindow()
    if (mainWin) {
      mainWin.webContents.send('updater:state-changed', state)
    }
  })

  // Create the main application window
  createWindow()

  // Start the Python backend process
  startBackend(currentDataDir)

  // Check for application updates (skip in dev)
  if (!is.dev) {
    checkForUpdates()
  }
})

// Window activation (macOS)
app.on('activate', () => {
  if (getMainWindow() === null) {
    createWindow()
  }
})

// Cleanup on quit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    setTimeout(() => {
      stopBackend()
      app.quit()
    }, 500)
  }
})

app.on('before-quit', () => {
  setTimeout(() => stopBackend(), 500)
})

// Window activation (macOS)
app.on('activate', () => {
  if (getMainWindow() === null) {
    createWindow()
  }
})

// Cleanup on quit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    setTimeout(() => {
      stopBackend()
      app.quit()
    }, 500)
  }
})

app.on('before-quit', () => {
  setTimeout(() => stopBackend(), 500)
})
