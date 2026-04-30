import { ipcRenderer } from 'electron'
import path from 'path'

/**
 * Get the model directory based on environment or default
 */
async function getModelDir(): Promise<string> {
  // Get the data directory from the main process
  const dataDir = await ipcRenderer.invoke('app:get-data-dir')
  return path.join(dataDir, 'models', 'clip-vit-b32')
}

/**
 * Get model folder info: path and size on disk
 */
export async function getModelFolderInfo(): Promise<{ path: string; size: number }> {
  try {
    const fs = await import('fs/promises')
    const modelDir = await getModelDir()
    let size = 0

    // Check if model directory exists
    try {
      const stat = await fs.stat(modelDir)
      if (!stat.isDirectory()) {
        return { path: modelDir, size: 0 }
      }
    } catch {
      // Directory doesn't exist
      return { path: modelDir, size: 0 }
    }

    // Recursively calculate size
    const calculateDirSize = async (dir: string): Promise<number> => {
      let totalSize = 0
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            totalSize += await calculateDirSize(fullPath)
          } else if (entry.isFile()) {
            try {
              const stats = await fs.stat(fullPath)
              totalSize += stats.size
            } catch {
              // ignore errors
            }
          }
        }
      } catch (err) {
        console.warn(`[getModelFolderInfo] Error reading ${dir}:`, err)
      }
      return totalSize
    }

    size = await calculateDirSize(modelDir)

    return { path: modelDir, size }
  } catch (err) {
    console.error('[getModelFolderInfo] Error:', err)
    // Return default values on error
    return { path: await getModelDir(), size: 0 }
  }
}

/**
 * Move model folder to a new directory
 * @param newDir The new base directory where the model folder should be moved
 */
export async function moveModelFolder(newDir: string): Promise<{ path: string; size: number }> {
  try {
    const fs = await import('fs/promises')
    const oldModelDir = await getModelDir()
    const newModelDir = path.join(newDir, 'models', 'clip-vit-b32')

    // Validate new directory
    const newDirStat = await fs.stat(newDir)
    if (!newDirStat.isDirectory()) {
      throw new Error('Invalid target directory')
    }

    // Create the new model directory (and parent dirs) if they don't exist
    await fs.mkdir(newModelDir, { recursive: true })

    // Recursively copy all files from old to new
    const copyDir = async (src: string, dest: string): Promise<void> => {
      try {
        const entries = await fs.readdir(src, { withFileTypes: true })
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)
          
          if (entry.isDirectory()) {
            await fs.mkdir(destPath, { recursive: true })
            await copyDir(srcPath, destPath)
          } else if (entry.isFile()) {
            // Ensure parent directory exists
            await fs.mkdir(path.dirname(destPath), { recursive: true })
            await fs.copyFile(srcPath, destPath)
          }
        }
      } catch (err) {
        console.error(`[moveModelFolder] Error copying ${src}:`, err)
        throw err
      }
    }

    // Check if old model directory exists and copy it
    try {
      const oldStat = await fs.stat(oldModelDir)
      if (oldStat.isDirectory()) {
        await copyDir(oldModelDir, newModelDir)
        // Remove the old model directory after successful copy
        await fs.rm(oldModelDir, { recursive: true, force: true })
      }
    } catch {
      // Old directory doesn't exist, that's fine
    }

    // Notify backend about the new data directory
    try {
      await ipcRenderer.invoke('model:set-data-dir', newDir)
    } catch (err) {
      console.warn('[moveModelFolder] Failed to notify backend:', err)
      // Continue anyway - the move succeeded even if notification failed
    }

    // Calculate the size of the moved folder
    let size = 0
    try {
      const calculateSizeAfterMove = async (dir: string): Promise<number> => {
        let totalSize = 0
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            totalSize += await calculateSizeAfterMove(fullPath)
          } else if (entry.isFile()) {
            try {
              const stats = await fs.stat(fullPath)
              totalSize += stats.size
            } catch {
              // ignore errors
            }
          }
        }
        return totalSize
      }
      size = await calculateSizeAfterMove(newModelDir)
    } catch (err) {
      console.warn('[moveModelFolder] Could not calculate size:', err)
    }

    return { path: newModelDir, size }
  } catch (err) {
    console.error('[moveModelFolder] Error:', err)
    throw err
  }
}

/**
 * Delete the model folder entirely
 */
export async function deleteModelFolder(): Promise<void> {
  try {
    const fs = await import('fs/promises')
    const modelDir = await getModelDir()
    await fs.rm(modelDir, { recursive: true, force: true })
  } catch (err) {
    console.error('[deleteModelFolder] Error:', err)
    throw err
  }
}