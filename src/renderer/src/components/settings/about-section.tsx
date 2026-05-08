import { useState, useEffect } from 'react'
import { AppUpdate } from '../updater/app-update'
import { AppWindowIcon } from '@phosphor-icons/react'

export function AboutSection(): React.JSX.Element {
  const [appVersion, setAppVersion] = useState('')

  useEffect(() => {
    window.api.app
      .getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion('Unknown'))
  }, [])

  return (
    <div className="px-4 py-2 space-y-2">
      <div className="flex gap-2 items-center text-base">
        <AppWindowIcon className="text-muted-foreground" size={24} /> About
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">App Version</div>
          <div className="mt-1 font-mono text-sm text-foreground">{appVersion || 'Loading...'}</div>
        </div>
        <AppUpdate />
      </div>
    </div>
  )
}
