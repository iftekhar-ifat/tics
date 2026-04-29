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
  '.avif',
]);

/**
 * Scan a folder for images and return count and total size
 * @param dirPath Path to directory to scan
 * @returns Promise with imageCount and totalSize in bytes
 */
export async function scanFolder(dirPath: string): Promise<{ imageCount: number; totalSize: number }> {
  let imageCount = 0;
  let totalSize = 0;

  try {
    // Use fs.promises for async file operations in Electron preload
    const fs = await import('fs/promises');
    const path = await import('path');
    
    async function scanDirectory(directory: string): Promise<void> {
      try {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(directory, entry.name);
          
          if (entry.isDirectory()) {
            // Recursively scan subdirectories
            await scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTENSIONS.has(ext)) {
              imageCount++;
              try {
                const stats = await fs.stat(fullPath);
                totalSize += stats.size;
              } catch (err) {
                console.warn(`[scanFolder] Could not get size of ${entry.name}:`, err);
              }
            }
          }
        }
      } catch (err) {
        console.error(`[scanFolder] Error scanning directory ${directory}:`, err);
      }
    }
    
    // Start scanning from the root directory
    await scanDirectory(dirPath);
    
  } catch (err) {
    console.error('[scanFolder] Fatal error:', err);
  }

  return { imageCount, totalSize };
}