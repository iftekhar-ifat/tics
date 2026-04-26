'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TerminalIcon } from '@phosphor-icons/react'
import { Separator } from '@/components/ui/separator'

export function AboutSection(): React.JSX.Element {
  const [appVersion, setAppVersion] = useState('')
  const { rootFolder } = useAppStore()

  useEffect(() => {
    // Fetch app version
    window.api.app
      .getVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion('Unknown'))
  }, [])

  const totalImages = rootFolder ? rootFolder.imageCount : 0

  const handleOpenLogFile = async () => {
    try {
      await window.api.file.openItem('logs')
    } catch (err) {
      // Fallback: try to open the app data directory
      console.error('Failed to open log file:', err)
    }
  }

  return (
    <Card className="rounded-none border-b-0 border-x-0 bg-card shadow-none">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm">About</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {/* App Version */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">App Version</div>
            <div className="mt-1 font-mono text-sm text-foreground">
              {appVersion || 'Loading...'}
            </div>
          </div>
        </div>

        <Separator />

        {/* Total Images Indexed */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Total Images Indexed</div>
            <div className="mt-1 text-2xl font-mono text-foreground">
              {totalImages.toLocaleString()}
            </div>
          </div>
          <TerminalIcon className="size-8 text-muted-foreground/30" />
        </div>

        <Separator />

        {/* Open Log File */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Log File</div>
            <div className="mt-1 text-xs text-muted-foreground/70">tcs.log</div>
          </div>
          <Button
            variant="outline"
            size="xs"
            onClick={handleOpenLogFile}
            className="h-7 gap-1 rounded-none border px-2 text-xs"
          >
            <TerminalIcon className="size-3" />
            Open Log
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
