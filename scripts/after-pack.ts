import { existsSync, mkdirSync, copyFileSync, readdirSync, rmSync, chmodSync } from 'fs'
import { join } from 'path'
import type { AfterPackContext } from 'electron-builder'

export default async function afterPack(context: AfterPackContext): Promise<void> {
  // --- Locale pruning ---
  const localeDir = join(context.appOutDir, 'locales')
  if (existsSync(localeDir)) {
    const keepLocales = ['en-US.pak', 'en-GB.pak']
    for (const file of readdirSync(localeDir)) {
      if (file.endsWith('.pak') && !keepLocales.includes(file)) {
        rmSync(join(localeDir, file))
        console.log(`Removed locale: ${file}`)
      }
    }
  }

  // --- Copy PyInstaller binary to resources ---
  const isWindows = context.electronPlatformName === 'win32'
  const binaryName = isWindows ? 'main.exe' : 'main'

  // PyInstaller --onefile --name main creates backend/dist/main.exe (directly in dist/)
  const projectRoot = join(context.appOutDir, '../../..') // out/<platform>/ -> project root
  const binarySrc = join(projectRoot, 'backend', 'dist', binaryName)
  const backendDest = join(context.appOutDir, 'resources', 'backend')

  console.log(`[after-pack] Platform: ${context.electronPlatformName}`)
  console.log(`[after-pack] Project root: ${projectRoot}`)
  console.log(`[after-pack] Looking for PyInstaller binary at: ${binarySrc}`)

  if (!existsSync(backendDest)) {
    mkdirSync(backendDest, { recursive: true })
  }

  // If PyInstaller binary exists, copy it
  if (existsSync(binarySrc)) {
    const binaryDest = join(backendDest, binaryName)
    copyFileSync(binarySrc, binaryDest)
    console.log(`[after-pack] Copied backend binary to resources/backend/${binaryName}`)

    // Ensure executable bit is set on macOS/Linux
    if (!isWindows) {
      chmodSync(binaryDest, 0o755)
      console.log(`[after-pack] Set executable bit on ${binaryName}`)
    }
  } else {
    // Fallback: copy Python source files
    console.log(`[after-pack] PyInstaller binary not found at ${binarySrc}`)
    console.log(`[after-pack] Falling back to copying Python source files...`)

    const backendSrc = join(projectRoot, 'backend')
    const filesToCopy = ['main.py', 'pyproject.toml']
    for (const file of filesToCopy) {
      const src = join(backendSrc, file)
      const dest = join(backendDest, file)
      if (existsSync(src)) {
        copyFileSync(src, dest)
        console.log(`[after-pack] Copied backend/${file} to resources (fallback)`)
      }
    }
  }
}
