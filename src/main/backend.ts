import { spawn, ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'
import { is } from '@electron-toolkit/utils'
import {
  setBackendStatus,
  getBackendStatus,
  getMainWindow
} from './state'

let backendProcess: ChildProcess | null = null
let requestId = 0
const pendingRequests = new Map<
  number,
  { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
>()
let stdoutBuffer = ''

export function callBackend(
  method: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!backendProcess || getBackendStatus() !== 'running') {
      reject(new Error('Backend not running'))
      return
    }

    const id = ++requestId
    pendingRequests.set(id, { resolve, reject })

    const request = JSON.stringify({ method, params, id }) + '\n'
    backendProcess.stdin?.write(request)

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject(new Error(`IPC request timeout: ${method}`))
      }
    }, 300000)
  })
}

export function startBackend(currentDataDir: string): void {
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

  setBackendStatus('starting')

  try {
    const cmd = is.dev ? finalPythonCmd : backendScript
    const spawnArgs = is.dev ? args : []
    backendProcess = spawn(cmd, spawnArgs, {
      cwd: is.dev ? join(__dirname, '../../backend') : join(process.resourcesPath, 'backend'),
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, TICS_DATA_DIR: currentDataDir }
    })

    backendProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString()
      let newlineIndex
      while ((newlineIndex = stdoutBuffer.indexOf('\n')) !== -1) {
        const line = stdoutBuffer.slice(0, newlineIndex)
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1)

        if (line.trim()) {
          if (line.includes('[IPC] Bridge started')) {
            setBackendStatus('running')
            continue
          }

          try {
            const msg = JSON.parse(line)
            if (msg.type !== undefined && msg.id === undefined) {
              // Push event: forward to renderer if needed
              const mainWin = getMainWindow()
              if (mainWin) {
                mainWin.webContents.send('backend:event', msg)
              }
            } else if (msg.id !== undefined) {
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
          } catch {
            // Not JSON, ignore
          }
        }
      }
    })

    backendProcess.stderr?.on('data', (data: Buffer) => {
      const stderr = data.toString()
      const lines = stderr.split('\n').filter((l) => l.trim())
      for (const line of lines) {
        try {
          const msg = JSON.parse(line)
          if (msg.type && !msg.id) {
            const mainWin = getMainWindow()
            if (mainWin) {
              mainWin.webContents.send('backend:event', msg)
            }
          }
        } catch {
          // Not JSON, ignore
        }
      }
    })

    backendProcess.on('error', (err) => {
      console.error('[IPC Error]:', err)
      setBackendStatus('error')
    })

    backendProcess.on('exit', (code) => {
      console.log('[IPC exited] Code:', code)
      setBackendStatus('stopped')
    })
  } catch (error) {
    console.error('[Main] Failed to spawn backend:', error)
    setBackendStatus('error')
  }
}

export function stopBackend(): void {
  if (!backendProcess) return

  console.log('[Main] Stopping IPC backend...')

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', backendProcess.pid!.toString(), '/F', '/T'])
  } else {
    backendProcess.kill('SIGTERM')
  }

  backendProcess = null
  pendingRequests.clear()
}