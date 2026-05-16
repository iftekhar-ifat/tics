import { readdirSync, statSync } from 'fs'
import { join } from 'path'

export const IMAGE_EXTENSIONS = new Set([
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

export function scanFolderSync(dirPath: string): { imageCount: number; totalSize: number } {
  let imageCount = 0
  let totalSize = 0

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)

      if (entry.isDirectory()) {
        const sub = scanFolderSync(fullPath)
        imageCount += sub.imageCount
        totalSize += sub.totalSize
      } else if (entry.isFile()) {
        const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf('.'))
        if (IMAGE_EXTENSIONS.has(ext)) {
          imageCount++
          try {
            totalSize += statSync(fullPath).size
          } catch {
            // skip unreadable files
          }
        }
      }
    }
  } catch (error) {
    console.error('Error scanning directory:', error)
  }

  return { imageCount, totalSize }
}
