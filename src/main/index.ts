import { app, shell, BrowserWindow, ipcMain, dialog, session } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
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
let requestId = 0
const pendingRequests = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
>()
let stdoutBuffer = ''

function broadcastUpdateState(): void {
  if (!mainWindow) return
  mainWindow.webContents.send('updater:state-changed', updateState)
}

function broadcastBackendStatus(): void {
  if (!mainWindow) return
  mainWindow.webContents.send('backend:status-changed', {
    status: backendStatus
  })
}

function callBackend(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!backendProcess || backendStatus !== 'running') {
      reject(new Error('Backend not running'))
      return
    }

    const id = ++requestId
    pendingRequests.set(id, { resolve, reject })

    const request = JSON.stringify({ method, params, id }) + '\n'
    console.log('[IPC] Sending request:', request.trim())
    backendProcess.stdin?.write(request)

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error(`IPC request timeout: ${method}`))
      }
    }, 300000)
  })
}

function startBackend(): void {
  const isWindows = process.platform === 'win32'

  const venvPath = is.dev
    ? join(__dirname, '../../backend/.venv', isWindows ? 'Scripts/python.exe' : 'bin/python')
    : null
  const useVenvPython = is.dev && venvPath && existsSync(venvPath) ? venvPath : null

  const pythonCmd = isWindows ? 'python' : 'python3'
  const finalPythonCmd = useVenvPython || pythonCmd

  let backendScript: string
  let args: string[]

  if (is.dev) {
    backendScript = join(__dirname, '../../backend/ipc_bridge.py')
    args = [backendScript]
  } else {
    backendScript = join(process.resourcesPath, 'backend/ipc_bridge.exe')
    args = []
  }

  console.log('[Main] Starting IPC backend...')
  console.log('[Main] Python command:', is.dev ? finalPythonCmd : 'N/A (using exe)')
  console.log('[Main] Script:', backendScript)

  backendStatus = 'starting'
  broadcastBackendStatus()

  try {
    const cmd = is.dev ? finalPythonCmd : backendScript
    const spawnArgs = is.dev ? args : []
    backendProcess = spawn(cmd, spawnArgs, {
      cwd: is.dev ? join(__dirname, '../../backend') : join(process.resourcesPath, 'backend'),
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, TICS_DATA_DIR: app.getPath('userData') }
    })

    backendProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString()
      console.log('[IPC] Raw stdout:', stdoutBuffer)
      let newlineIndex
      while ((newlineIndex = stdoutBuffer.indexOf('\n')) !== -1) {
        const line = stdoutBuffer.slice(0, newlineIndex)
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1)

        if (line.trim()) {
          if (line.includes('[IPC] Bridge started')) {
            backendStatus = 'running'
            broadcastBackendStatus()
            console.log('[IPC] Backend running')
            continue
          }

          console.log('[IPC] Processing line:', line)
          try {
            const msg = JSON.parse(line)
            console.log('[IPC] Parsed:', JSON.stringify(msg))

            // Push event (has type, no id)
            if (msg.type !== undefined && msg.id === undefined) {
              console.log('[IPC] Push event detected:', msg.type, msg.data)
              if (mainWindow) {
                mainWindow.webContents.send('backend:event', msg)
              }
            }
            // Response (has id)
            else if (msg.id !== undefined) {
              console.log('[IPC] Response for id:', msg.id)
              if (pendingRequests.has(msg.id)) {
                const { resolve, reject } = pendingRequests.get(msg.id)!
                pendingRequests.delete(msg.id)
                if (msg.error) {
                  reject(new Error(msg.error.message))
                } else {
                  resolve(msg.result)
                }
              }
            }
          } catch (e) {
            console.log('[IPC] Not JSON:', line.substring(0, 50))
          }
        }
      }
    })

    backendProcess.stderr?.on('data', (data: Buffer) => {
      const stderr = data.toString()
      console.log('[IPC stderr]:', stderr)

      // Parse JSON push events from stderr (for model download progress)
      const lines = stderr.split('\n').filter((l) => l.trim())
      for (const line of lines) {
        try {
          const msg = JSON.parse(line)
          if (msg.type && !msg.id) {
            console.log('[IPC] Push event from stderr:', msg.type, msg.data)
            if (mainWindow) {
              mainWindow.webContents.send('backend:event', msg)
            }
          }
        } catch {
          // Not JSON, ignore
        }
      }
    })

    backendProcess.on('error', (err) => {
      console.error('[IPC Error]:', err)
      backendStatus = 'error'
      broadcastBackendStatus()
    })

    backendProcess.on('exit', (code) => {
      console.log('[IPC exited] Code:', code)
      backendStatus = 'stopped'
      broadcastBackendStatus()
    })
  } catch (error) {
    console.error('[Main] Failed to spawn backend:', error)
    backendStatus = 'error'
    broadcastBackendStatus()
  }
}

function stopBackend(): void {
  if (backendStopCalled || !backendProcess) return
  backendStopCalled = true

  console.log('[Main] Stopping IPC backend...')

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', backendProcess.pid!.toString(), '/F', '/T'])
  } else {
    backendProcess.kill('SIGTERM')
  }

  backendProcess = null
  pendingRequests.clear()
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    setUpdateState({ status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    setUpdateState({ status: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    setUpdateState({ status: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    setUpdateState({ status: 'downloading', progressPercent: progress.percent })
  })

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({ status: 'downloaded', downloadedVersion: info.version })
  })

  autoUpdater.on('error', (err) => {
    setUpdateState({ status: 'error', message: err.message })
  })
}

function setUpdateState(state: UpdateState): void {
  updateState = state
  broadcastUpdateState()
}

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

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
        ]
      }
    })
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.iftekhar.tics')

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
      return { ok: false, message: String(error) }
    }
  })

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  })

  ipcMain.handle('updater:quit-and-install', () => {
    autoUpdater.quitAndInstall()
  })

  ipcMain.handle('backend:get-status', () => ({
    status: backendStatus
  }))

  ipcMain.handle('dialog:open-directory', async () => {
    if (!mainWindow) return { canceled: true, filePaths: [] }
    return await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
  })

  ipcMain.handle('folder:scan', async (_event, dirPath: string) => {
    try {
      return await callBackend('folder.scan', { path: dirPath })
    } catch (error) {
      console.error('folder:scan error:', error)
      return { imageCount: 0, totalSize: 0 }
    }
  })

  ipcMain.handle('system:get-os-info', async () => {
    try {
      return await callBackend('system.getOSInfo')
    } catch (error) {
      console.error('system:get-os-info error:', error)
      return { os: 'Unknown', device: 'cpu', deviceName: 'Unknown', memory: 'Unknown' }
    }
  })

  ipcMain.handle('model:get-status', async () => {
    try {
      const result = await callBackend('model.getStatus')
      return { ok: true, data: result }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  })

  ipcMain.handle('model:download', async () => {
    try {
      console.log('[IPC] Calling model.download')
      const result = await callBackend('model.download')
      console.log('[IPC] model.download result:', result)
      return { ok: true, data: result }
    } catch (error) {
      console.error('[IPC] model.download error:', error)
      return { ok: false, message: String(error) }
    }
  })

  ipcMain.handle('model:cancel-download', async () => {
    try {
      const result = await callBackend('model.cancelDownload')
      return { ok: true, data: result }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  })

  createWindow()
  startBackend()

  if (!is.dev) {
    void autoUpdater.checkForUpdates().catch(() => {
      setUpdateState({ status: 'error', message: 'Silent update check failed' })
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

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
