import { existsSync, mkdirSync, copyFileSync, readdirSync, rmSync } from 'fs'
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

  // --- Copy backend files to resources ---
  const projectRoot = join(context.appOutDir, '../../..') // out/<platform>/ -> project root
  const backendSrc = join(projectRoot, 'backend')
  const backendDest = join(context.appOutDir, 'resources', 'backend')

  if (!existsSync(backendSrc)) {
    console.warn(`[afterPack] Backend source not found at ${backendSrc}, skipping backend copy`)
    return
  }

  if (!existsSync(backendDest)) {
    mkdirSync(backendDest, { recursive: true })
  }

  // Copy Python files
  const filesToCopy = ['main.py', 'requirements.txt']
  for (const file of filesToCopy) {
    const src = join(backendSrc, file)
    const dest = join(backendDest, file)
    if (existsSync(src)) {
      copyFileSync(src, dest)
      console.log(`Copied backend/${file} to resources`)
    }
  }
}
