import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
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
let backendProcess: ChildProcess | null = null
let backendStatus: 'starting' | 'running' | 'stopped' | 'error' = 'stopped'
let backendStopCalled = false

// Broadcast helpers

function broadcastUpdateState(): void {
  if (!mainWindow) return
  mainWindow.webContents.send('updater:state-changed', updateState)
}

function broadcastBackendStatus(): void {
  if (!mainWindow) return
  mainWindow.webContents.send('backend:status-changed', {
    status: backendStatus,
    url: backendStatus === 'running' ? 'http://127.0.0.1:8765' : null
  })
}

// Backend lifecycle
/**
 * Poll /health until the backend responds 200 or we exhaust retries.
 * Resolves true if healthy, false if timed out.
 */
async function waitForBackend(retries = 20, intervalMs = 300): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch('http://127.0.0.1:8765/health')
      if (res.ok) return true
    } catch {
      // Not up yet — keep waiting
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}

function startBackend(): void {
  const isWindows = process.platform === 'win32'

  // In production, use the PyInstaller binary. In dev, use python directly.
  const backendBinary = is.dev
    ? null
    : join(process.resourcesPath, 'backend', isWindows ? 'main.exe' : 'main')

  const pythonCmd = isWindows ? 'python' : 'python3'

  const backendPath = is.dev
    ? join(__dirname, '../../backend/main.py')
    : join(process.resourcesPath, 'backend/main.py')

  console.log('[Main] Starting backend...')
  console.log('[Main] Backend binary:', backendBinary)
  console.log('[Main] Backend script:', backendPath)
  backendStatus = 'starting'
  broadcastBackendStatus()

  const cmd = is.dev ? pythonCmd : backendBinary || pythonCmd
  const args = is.dev ? [backendPath] : []

  try {
    backendProcess = spawn(cmd, args, {
      cwd: is.dev ? join(__dirname, '../../backend') : join(process.resourcesPath, 'backend'),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    })

    backendProcess.stdout?.on('data', (data) => {
      console.log('[Backend stdout]:', data.toString())
    })

    backendProcess.stderr?.on('data', (data) => {
      console.error('[Backend stderr]:', data.toString())
    })

    backendProcess.on('error', (err) => {
      console.error('[Backend error]:', err)
      backendStatus = 'error'
      broadcastBackendStatus()
    })

    backendProcess.on('exit', (code) => {
      console.log('[Backend exited] Code:', code)
      backendStatus = 'stopped'
      broadcastBackendStatus()
    })

    // Health-poll instead of a fixed timeout
    waitForBackend().then((healthy) => {
      if (healthy) {
        backendStatus = 'running'
      } else {
        console.error('[Main] Backend did not become healthy in time')
        backendStatus = 'error'
      }
      broadcastBackendStatus()
    })
  } catch (error) {
    console.error('[Main] Failed to spawn backend:', error)
    backendStatus = 'error'
    broadcastBackendStatus()
  }
}

function stopBackend(): void {
  // Guard against being called twice (window-all-closed + before-quit)
  if (backendStopCalled || !backendProcess) return
  backendStopCalled = true

  console.log('[Main] Stopping backend...')

  if (process.platform === 'win32') {
    // On Windows, kill the whole process tree
    spawn('taskkill', ['/pid', backendProcess.pid!.toString(), '/F', '/T'])
  } else {
    // Send SIGTERM first, then SIGKILL after 3s if still alive
    backendProcess.kill('SIGTERM')
    const killTimer = setTimeout(() => {
      if (backendProcess) {
        console.warn('[Main] Backend did not exit after SIGTERM — sending SIGKILL')
        backendProcess.kill('SIGKILL')
      }
    }, 3000)
    // If it exits cleanly, cancel the SIGKILL
    backendProcess.once('exit', () => clearTimeout(killTimer))
  }

  backendProcess = null
}

// Auto-updater

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
    setUpdateState({ status: 'downloading', progressPercent: progress.percent })
  })
  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({ status: 'downloaded', downloadedVersion: info.version })
  })
  autoUpdater.on('error', (error) => {
    setUpdateState({ status: 'error', message: error?.message ?? 'Unknown updater error' })
  })
}

// Window

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 1024,
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

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// App lifecycle

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.iftekhar.tics')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupAutoUpdater()

  // --- IPC: app ---
  ipcMain.handle('app:get-version', () => app.getVersion())

  // --- IPC: updater ---
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

  // --- IPC: backend ---
  ipcMain.handle('backend:get-status', () => ({
    status: backendStatus,
    url: backendStatus === 'running' ? 'http://127.0.0.1:8765' : null
  }))

  ipcMain.handle('backend:get-http-status', async () => {
    try {
      const response = await fetch('http://127.0.0.1:8765/api/status')
      const data = await response.json()
      return { ok: true, data }
    } catch {
      return { ok: false, message: 'Failed to connect to backend' }
    }
  })

  createWindow()
  startBackend()

  void autoUpdater.checkForUpdates().catch(() => {
    setUpdateState({ status: 'error', message: 'Silent update check failed' })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopBackend()
    app.quit()
  }
})

app.on('before-quit', () => {
  stopBackend()
})
