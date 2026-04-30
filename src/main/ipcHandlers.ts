import { ipcMain, dialog, shell, app } from 'electron'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'

import { callBackend } from './backend'
import { getDataDir, setDataDir as persistDataDir } from './config'
import { getMainWindow, getBackendStatus } from './state'
import { getUpdateState } from './state'

const IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.svg',
  '.ico',
  '.tiff',
  '.tif'
]

function getAllImages(
  dirPath: string,
  basePath: string
): { name: string; path: string; relativePath: string }[] {
  const images: { name: string; path: string; relativePath: string }[] = []

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        images.push(...getAllImages(fullPath, basePath))
      } else if (entry.isFile()) {
        const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf('.'))
        if (IMAGE_EXTENSIONS.includes(ext)) {
          images.push({
            name: entry.name,
            path: fullPath,
            relativePath: fullPath.replace(basePath, '').replace(/^[\\/]/, '')
          })
        }
      }
    }
  } catch (error) {
    console.error('Error reading directory:', error)
  }

  return images
}

export function registerIpcHandlers(): void {
  // App
  ipcMain.handle('app:get-version', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:get-data-dir', () => {
    return getDataDir()
  })

  // Dialog
  ipcMain.handle('dialog:open-directory', async () => {
    const mainWin = getMainWindow()
    if (!mainWin) return { canceled: true, filePaths: [] }
    return await dialog.showOpenDialog(mainWin, {
      properties: ['openDirectory']
    })
  })

  // Folder operations
  ipcMain.handle('folder:scan', async (_event, dirPath: string) => {
    try {
      return await callBackend('folder.scan', { path: dirPath })
    } catch (error) {
      console.error('folder:scan error:', error)
      return { imageCount: 0, totalSize: 0 }
    }
  })

   ipcMain.handle('folder:list-subdirs', async (_event, dirPath: string) => {
     try {
       if (!existsSync(dirPath)) return []
       const entries = readdirSync(dirPath, { withFileTypes: true })
       return entries
         .filter((entry) => entry.isDirectory())
         .map((entry) => ({
           name: entry.name,
           path: join(dirPath, entry.name)
         }))
     } catch (error) {
       console.error('folder:list-subdirs error:', error)
       return []
     }
   })

   ipcMain.handle('folder:get-all-images', async (_event, dirPath: string) => {
     try {
       if (!existsSync(dirPath)) return []
       return getAllImages(dirPath, dirPath)
     } catch (error) {
       console.error('folder:get-all-images error:', error)
       return []
     }
   })

   // File open
  ipcMain.handle('file:open-item', async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath)
      return true
    } catch (error) {
      console.error('file:open-item error:', error)
      throw error
    }
  })

  // System info
  ipcMain.handle('system:get-os-info', async () => {
    try {
      return await callBackend('system.getOSInfo')
    } catch (error) {
      console.error('system:get-os-info error:', error)
      return { os: 'Unknown', device: 'cpu', deviceName: 'Unknown', memory: 'Unknown' }
    }
  })

  // Model status
  ipcMain.handle('model:get-status', async () => {
    try {
      const result = await callBackend('model.getStatus')
      return { ok: true, data: result }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  })

  // Model download
  ipcMain.handle('model:download', async () => {
    try {
      const result = await callBackend('model.download')
      return { ok: true, data: result }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  })

  // Model cancel download
  ipcMain.handle('model:cancel-download', async () => {
    try {
      const result = await callBackend('model.cancelDownload')
      return { ok: true, data: result }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  })

  // Model set data dir
  ipcMain.handle('model:set-data-dir', async (_event, newDir: string) => {
    try {
      persistDataDir(newDir)
      const result = await callBackend('model.setDataDir', { path: newDir })
      return { ok: true, data: result }
    } catch (error) {
      return { ok: false, message: String(error) }
    }
  })

  // Updater
  ipcMain.handle('updater:get-state', () => {
    return getUpdateState()
  })

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

  // Backend status
  ipcMain.handle('backend:get-status', () => ({
    status: getBackendStatus()
  }))
}