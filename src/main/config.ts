import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'

const CONFIG_FILE_NAME = 'tics-config.json'

let currentDataDir: string = app.getPath('userData')

export function loadConfig(): void {
  try {
    const configPath = join(app.getPath('userData'), CONFIG_FILE_NAME)
    if (existsSync(configPath)) {
      const configContent = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(configContent)
      if (config.dataDir && typeof config.dataDir === 'string') {
        currentDataDir = config.dataDir
        console.log('[Config] Loaded custom data directory:', currentDataDir)
      }
    }
  } catch (err) {
    console.error('[Config] Failed to load config:', err)
  }
}

export function getDataDir(): string {
  return currentDataDir
}

export function setDataDir(newDir: string): void {
  currentDataDir = newDir
  const configPath = join(app.getPath('userData'), CONFIG_FILE_NAME)
  writeFileSync(configPath, JSON.stringify({ dataDir: newDir }, null, 2))
  console.log('[Config] Saved custom data directory:', newDir)
}
