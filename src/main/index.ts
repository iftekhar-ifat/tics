import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

type UpdateState = {
  status: UpdateStatus
  version?: string
  downloadedVersion?: string
  progressPercent?: number
  message?: string
}

let mainWindow: BrowserWindow | null = null
let updateState: UpdateState = { status: 'idle' }

function broadcastUpdateState(): void {
  if (!mainWindow) return
  mainWindow.webContents.send('updater:state-changed', updateState)
}

function setUpdateState(next: UpdateState): void {
  updateState = next
  broadcastUpdateState()
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => setUpdateState({ status: 'checking' }))
  autoUpdater.on('update-available', (info) => {
    setUpdateState({ status: 'available', version: info.version })
  })
  autoUpdater.on('update-not-available', () => setUpdateState({ status: 'not-available' }))
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
  autoUpdater.on('error', (error) => {
    setUpdateState({ status: 'error', message: error?.message ?? 'Unknown updater error' })
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.iftekhar.tics')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupAutoUpdater()

  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('updater:get-state', () => updateState)
  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check for updates'
      setUpdateState({ status: 'error', message })
      return { ok: false, message }
    }
  })
  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download update'
      setUpdateState({ status: 'error', message })
      return { ok: false, message }
    }
  })
  ipcMain.handle('updater:quit-and-install', () => {
    autoUpdater.quitAndInstall()
  })

  createWindow()
  void autoUpdater.checkForUpdates().catch(() => {
    setUpdateState({ status: 'error', message: 'Silent update check failed' })
  })

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
