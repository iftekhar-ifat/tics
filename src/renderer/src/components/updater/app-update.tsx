import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowsCounterClockwiseIcon, DownloadIcon, ArrowClockwiseIcon } from '@phosphor-icons/react'

interface UpdateButtonProps {
  className?: string
  size?: React.ComponentProps<typeof Button>['size']
  variant?: React.ComponentProps<typeof Button>['variant']
}

export function AppUpdate({
  className,
  size = 'sm',
  variant = 'outline'
}: UpdateButtonProps): React.JSX.Element {
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

  if (state.status === 'downloaded') {
    return (
      <Button size={size} className={className} onClick={restartToUpdate}>
        <ArrowClockwiseIcon className="h-4 w-4" />
        Restart to update ~ {state.downloadedVersion ?? state.version ?? 'latest'}
      </Button>
    )
  }

  if (state.status === 'available') {
    return (
      <Button size={size} className={className} disabled={isDownloading} onClick={downloadUpdate}>
        <DownloadIcon className="h-4 w-4" />
        Download update ~ {state.version ?? 'latest'}
      </Button>
    )
  }

  if (state.status === 'downloading') {
    return (
      <Button size={size} variant={variant} className={className} disabled>
        <DownloadIcon className="h-4 w-4" />
        Downloading... {Math.round(state.progressPercent ?? 0)}%
      </Button>
    )
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      disabled={isChecking}
      onClick={checkForUpdates}
    >
      <ArrowsCounterClockwiseIcon className="h-4 w-4" />
      {isChecking ? 'Checking...' : 'Check for updates'}
    </Button>
  )
}
