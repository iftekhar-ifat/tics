import { watch, FSWatcher } from 'chokidar'
import { getMainWindow } from './state'
import { scanFolderSync } from './folder-scanner'

let folderWatcher: FSWatcher | null = null
let folderWatchDebounce: ReturnType<typeof setTimeout> | null = null

function cleanup(): void {
  if (folderWatchDebounce) {
    clearTimeout(folderWatchDebounce)
    folderWatchDebounce = null
  }
  if (folderWatcher) {
    folderWatcher.close()
    folderWatcher = null
  }
}

function sendUpdate(rootPath: string): void {
  const win = getMainWindow()
  if (!win) return
  const info = scanFolderSync(rootPath)
  win.webContents.send('folder-watcher:update', {
    imageCount: info.imageCount,
    totalSize: info.totalSize
  })
}

export function startFolderWatcher(rootPath: string): boolean {
  cleanup()
  if (!rootPath) return false

  const win = getMainWindow()
  if (!win) return false

  folderWatcher = watch(rootPath, {
    persistent: true,
    ignoreInitial: false,
    ignored: /[\\/]\.tics[\\/]/
  })

  const onChanged = (): void => {
    if (folderWatchDebounce) clearTimeout(folderWatchDebounce)
    folderWatchDebounce = setTimeout(() => sendUpdate(rootPath), 1000)
  }

  folderWatcher.on('add', onChanged)
  folderWatcher.on('unlink', onChanged)
  folderWatcher.on('ready', () => sendUpdate(rootPath))

  return true
}

export function stopFolderWatcher(): void {
  cleanup()
}
