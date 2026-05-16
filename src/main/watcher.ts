import { watch, FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { scanFolderSync } from './folder-scanner'

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

let watcher: FSWatcher | null = null
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let wasChanged = false
let currentRootPath = ''

export function startWatcher(mainWindow: BrowserWindow, rootPath: string): void {
  stopWatcher()
  currentRootPath = rootPath

  watcher = watch(rootPath, {
    persistent: true,
    ignoreInitial: true,
    ignored: /[\\/]\.tics[\\/]/
  })

  const handleChange = (_filePath: string): void => {
    const ext = _filePath.toLowerCase().slice(_filePath.lastIndexOf('.'))
    if (!IMAGE_EXTENSIONS.has(ext)) return

    wasChanged = true
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      if (wasChanged && currentRootPath) {
        wasChanged = false
        const info = scanFolderSync(currentRootPath)
        mainWindow.webContents.send('backend:event', {
          type: 'watcher.filesChanged',
          data: { imageCount: info.imageCount, totalSize: info.totalSize }
        })
      }
    }, 2000)
  }

  watcher.on('add', handleChange)
  watcher.on('unlink', handleChange)
}

export function stopWatcher(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (watcher) {
    watcher.close()
    watcher = null
  }
  wasChanged = false
  currentRootPath = ''
}

export function getWatcherStatus(): { watching: boolean; rootPath: string } {
  return { watching: watcher !== null, rootPath: currentRootPath }
}
