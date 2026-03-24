import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowsCounterClockwiseIcon, DownloadIcon } from '@phosphor-icons/react'

export function UpdateBanner(): React.JSX.Element | null {
  const [state, setState] = useState<UpdateState>({ status: 'idle' })
  const [isChecking, setIsChecking] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    void window.api.updater.getState().then(setState)
    const unsubscribe = window.api.updater.onStateChanged((next) => setState(next))
    return unsubscribe
  }, [])

  const checkForUpdates = async (): Promise<void> => {
    setIsChecking(true)
    await window.api.updater.checkForUpdates()
    setIsChecking(false)
  }

  const downloadUpdate = async (): Promise<void> => {
    setIsDownloading(true)
    await window.api.updater.downloadUpdate()
    setIsDownloading(false)
  }

  const restartToUpdate = async (): Promise<void> => {
    await window.api.updater.quitAndInstall()
  }

  if (
    state.status !== 'available' &&
    state.status !== 'downloading' &&
    state.status !== 'downloaded'
  ) {
    return (
      <div className="fixed bottom-4 right-4">
        <Button size="sm" variant="outline" disabled={isChecking} onClick={checkForUpdates}>
          <ArrowsCounterClockwiseIcon className="h-4 w-4" />
          Check for updates
        </Button>
      </div>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[360px] shadow-lg">
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-foreground">Update available</div>
          <Badge variant="secondary">{state.downloadedVersion ?? state.version ?? 'latest'}</Badge>
        </div>
        {state.status === 'downloading' ? (
          <p className="text-xs text-muted-foreground">
            Downloading in background... {Math.round(state.progressPercent ?? 0)}%
          </p>
        ) : null}
        {state.status === 'downloaded' ? (
          <div className="flex items-center gap-2">
            <Button className="w-full" onClick={restartToUpdate}>
              Restart to update
            </Button>
          </div>
        ) : (
          <Button className="w-full" disabled={isDownloading} onClick={downloadUpdate}>
            <DownloadIcon className="h-4 w-4" />
            Download update
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
