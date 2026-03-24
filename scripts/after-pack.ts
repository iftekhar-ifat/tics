import { existsSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import type { AfterPackContext } from 'electron-builder'

export default async function afterPack(context: AfterPackContext): Promise<void> {
  const localeDir = join(context.appOutDir, 'locales')

  if (!existsSync(localeDir)) return

  const keepLocales = ['en-US.pak', 'en-GB.pak']

  for (const file of readdirSync(localeDir)) {
    if (file.endsWith('.pak') && !keepLocales.includes(file)) {
      rmSync(join(localeDir, file))
      console.log(`Removed locale: ${file}`)
    }
  }
}
