import { app, shell, BrowserWindow, ipcMain, dialog, session } from 'electron'
import { join } from 'path'
import { existsSync, readdir, stat, type Stats } from 'fs'
import { spawn, ChildProcess } from 'child_process'
import { arch, cpus, totalmem, platform, release, type } from 'os'
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

// Backend port - may change if default port is in use
const DEFAULT_BACKEND_PORT = 8765
let backendPort = DEFAULT_BACKEND_PORT

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
    url: backendStatus === 'running' ? `http://127.0.0.1:${backendPort}` : null
  })
}

// Backend lifecycle

/**
 * Poll /health until the backend responds 200 or we exhaust retries.
 * Resolves true if healthy, false if timed out.
 */
async function waitForBackend(port: number, retries = 20, intervalMs = 300): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`)
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

  // In production, use the PyInstaller binary if it exists. In dev, use python directly.
  const backendBinary = is.dev
    ? null
    : join(process.resourcesPath, 'backend', isWindows ? 'main.exe' : 'main')

  // Check if the binary actually exists (PyInstaller build may not have been run)
  const useBinary = backendBinary && existsSync(backendBinary) ? backendBinary : null

  // In dev mode, use the uv virtual environment's Python
  const venvPath = is.dev
    ? join(__dirname, '../../backend/.venv', isWindows ? 'Scripts/python.exe' : 'bin/python')
    : null
  const useVenvPython = is.dev && venvPath && existsSync(venvPath) ? venvPath : null

  // Fallback to system python if venv Python doesn't exist
  const pythonCmd = isWindows ? 'python' : 'python3'
  const finalPythonCmd = useVenvPython || pythonCmd

  const backendPath = is.dev
    ? join(__dirname, '../../backend/main.py')
    : join(process.resourcesPath, 'backend/main.py')

  console.log('[Main] Starting backend...')
  console.log('[Main] Platform:', process.platform)
  console.log('[Main] Mode:', is.dev ? 'development' : 'production')
  console.log('[Main] process.resourcesPath:', process.resourcesPath)
  console.log('[Main] Backend binary:', backendBinary)
  console.log('[Main] Binary exists:', useBinary ? 'YES' : 'NO')
  console.log('[Main] Python command:', finalPythonCmd)
  console.log('[Main] Backend script:', backendPath)
  backendStatus = 'starting'
  broadcastBackendStatus()

  const cmd = is.dev ? finalPythonCmd : useBinary || pythonCmd
  let portToUse = DEFAULT_BACKEND_PORT

  function spawnBackend(port: number): void {
    const args = is.dev || !useBinary ? [backendPath, `--port=${port}`] : [`--port=${port}`]

    console.log(`[Main] Spawning backend on port ${port}...`)

    backendProcess = spawn(cmd, args, {
      cwd: is.dev ? join(__dirname, '../../backend') : join(process.resourcesPath, 'backend'),
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, TICS_DATA_DIR: app.getPath('userData') }
    })

    backendProcess.stdout?.on('data', (data) => {
      console.log('[Backend stdout]:', data.toString())
    })

    backendProcess.stderr?.on('data', (data) => {
      const stderr = data.toString()
      console.error('[Backend stderr]:', stderr)

      // Check for port binding errors and retry with different port
      if (stderr.includes('10048') || stderr.includes('address already in use')) {
        console.log('[Main] Port binding failed, trying next port...')
        backendProcess?.kill()

        // Try ports 8766, 8767, 8768, 8769
        const nextPort = port + 1
        if (nextPort <= 8770) {
          portToUse = nextPort
          spawnBackend(portToUse)
        } else {
          console.error('[Main] All ports exhausted, backend cannot start')
          backendStatus = 'error'
          broadcastBackendStatus()
        }
      }
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

    // Health-poll using the correct port
    waitForBackend(port).then((healthy) => {
      if (healthy) {
        backendStatus = 'running'
        backendPort = port // Update the global port variable
        console.log(`[Main] Backend running on port ${port}`)
      } else {
        console.error('[Main] Backend did not become healthy in time')
        backendStatus = 'error'
      }
      broadcastBackendStatus()
    })
  }

  try {
    spawnBackend(portToUse)
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

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws://127.0.0.1:*"
        ]
      }
    })
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
    url: backendStatus === 'running' ? `http://127.0.0.1:${backendPort}` : null
  }))

  ipcMain.handle('backend:get-http-status', async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${backendPort}/api/status`)
      const data = await response.json()
      return { ok: true, data }
    } catch {
      return { ok: false, message: 'Failed to connect to backend' }
    }
  })

  // --- IPC: dialog ---
  ipcMain.handle('dialog:open-directory', async () => {
    if (!mainWindow) return { canceled: true, filePaths: [] }
    return await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
  })

  // --- IPC: folder ---
  const IMAGE_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.bmp',
    '.webp',
    '.tiff',
    '.tif',
    '.svg',
    '.ico',
    '.heic',
    '.heif',
    '.avif'
  ])

  async function scanFolder(dirPath: string): Promise<{ imageCount: number; totalSize: number }> {
    let imageCount = 0
    let totalSize = 0

    async function walk(currentPath: string): Promise<void> {
      let entries: string[]
      try {
        entries = await new Promise<string[]>((resolve, reject) => {
          readdir(currentPath, (err, files) => {
            if (err) reject(err)
            else resolve(files)
          })
        })
      } catch {
        return
      }

      await Promise.all(
        entries.map(async (entry) => {
          const fullPath = join(currentPath, entry)
          try {
            const fileStat = await new Promise<Stats>((resolve, reject) => {
              stat(fullPath, (err, s) => {
                if (err) reject(err)
                else resolve(s)
              })
            })
            if (fileStat.isDirectory()) {
              await walk(fullPath)
            } else if (fileStat.isFile()) {
              const ext = entry.slice(entry.lastIndexOf('.')).toLowerCase()
              if (IMAGE_EXTENSIONS.has(ext)) {
                imageCount++
                totalSize += fileStat.size
              }
            }
          } catch {
            // Skip inaccessible files
          }
        })
      )
    }

    await walk(dirPath)
    return { imageCount, totalSize }
  }

  ipcMain.handle('folder:scan', async (_event, dirPath: string) => {
    return await scanFolder(dirPath)
  })

  // --- IPC: system ---
  ipcMain.handle('system:get-os-info', () => {
    const osPlatform = platform()
    const osRelease = release()
    const osType = type()
    const totalMemory = totalmem()
    const cpuInfo = cpus()[0]?.model ?? 'Unknown CPU'

    let osName = `${osType} ${osRelease}`
    if (osPlatform === 'darwin') {
      osName = `macOS ${osRelease}`
    } else if (osPlatform === 'win32') {
      osName = `Windows ${osRelease}`
    } else {
      osName = `${osType} ${osRelease}`
    }

    const memoryGB = Math.round(totalMemory / (1024 * 1024 * 1024))

    // Simple GPU detection logic (placeholder - in real app would use proper detection)
    let device = 'cpu'
    let deviceName = cpuInfo

    // For now, default to CPU. In production, you'd check for NVIDIA GPU via nvidia-smi
    // or Apple Silicon via process.arch === 'arm64' on darwin

    if (osPlatform === 'darwin' && arch() === 'arm64') {
      device = 'mps'
      deviceName = 'Apple Silicon'
    } else {
      // Check for NVIDIA GPU (simplified)
      device = 'cpu'
      deviceName = cpuInfo
    }

    return {
      os: osName,
      device,
      deviceName,
      memory: `${memoryGB} GB`
    }
  })

  // --- IPC: model ---
  ipcMain.handle('model:get-status', async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${backendPort}/model/status`)
      const data = await response.json()
      return { ok: true, data }
    } catch {
      return { ok: false, message: 'Failed to connect to backend' }
    }
  })

  ipcMain.handle('model:download', async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${backendPort}/model/download`, {
        method: 'POST'
      })
      const data = await response.json()
      return { ok: true, data }
    } catch {
      return { ok: false, message: 'Failed to start download' }
    }
  })

  ipcMain.handle('model:cancel-download', async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${backendPort}/model/download/cancel`, {
        method: 'POST'
      })
      const data = await response.json()
      return { ok: true, data }
    } catch {
      return { ok: false, message: 'Failed to cancel download' }
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
