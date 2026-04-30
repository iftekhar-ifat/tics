import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useAppStore } from '@/stores/app-store'
import { useBackendEvents } from '@/hooks/use-backend-events'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  DownloadSimpleIcon,
  FolderOpenIcon,
  HardDriveIcon,
  WarningIcon
} from '@phosphor-icons/react'

export function Step03Model(): React.JSX.Element {
  const { setModelStatus, setDownloadProgress } = useOnboardingStore()
  const modelStatus = useAppStore((s) => s.modelStatus)
  const downloadProgress = useAppStore((s) => s.downloadProgress)
  const modelFolder = useAppStore((s) => s.modelFolder)

  const { onMessage } = useBackendEvents()
  const [device, setDevice] = useState<string>('')
  const [downloadSpeed, setDownloadSpeed] = useState<number>(0)
  const [selectError, setSelectError] = useState<string>('')
  const [downloadLocation, setDownloadLocation] = useState<string>('')

  useEffect(() => {
    const loadModelFolderInfo = async () => {
      try {
        const folderResult = await window.api.model.getFolderInfo()
        if (folderResult) {
          useAppStore
            .getState()
            .setModelFolder({ path: folderResult.path, size: folderResult.size })
          const dataDir = await window.api.app.getDataDir()
          setDownloadLocation(dataDir)
        }
      } catch {
        // Handled automatically
      }
    }

    const checkStatus = async () => {
      try {
        const result = await window.api.model.getStatus()
        if (result.ok && result.data?.ready) {
          setModelStatus('complete')
          setDownloadProgress(100)
          if (result.data.device) setDevice(result.data.device)
        } else if (result.data?.device) {
          setDevice(result.data.device)
        }
      } catch {
        // Handled automatically
      }
    }

    void (async () => {
      await checkStatus()
      await loadModelFolderInfo()
    })()
  }, [setDownloadProgress, setModelStatus])

  useEffect(() => {
    const handler = async (data: unknown): Promise<void> => {
      const msg = data as {
        type?: string
        data?: { percent?: number; speed?: number }
        percent?: number
        speed?: number
      }
      const eventData = msg.data || msg
      if (msg.type === 'model_download') {
        setDownloadProgress(eventData.percent ?? 0)
        setDownloadSpeed(eventData.speed ?? 0)
      }
      if (msg.type === 'model_download_complete') {
        setModelStatus('complete')
        setDownloadProgress(100)
        setDownloadSpeed(0)
        try {
          const folderResult = await window.api.model.getFolderInfo()
          if (folderResult) {
            useAppStore
              .getState()
              .setModelFolder({ path: folderResult.path, size: folderResult.size })
          }
        } catch {
          // Handled automatically
        }
      }
      if (msg.type === 'model_download_cancelled') {
        setModelStatus('default')
        setDownloadProgress(0)
        setDownloadSpeed(0)
      }
      if (msg.type === 'model_download_error') {
        setModelStatus('failed')
        setDownloadProgress(0)
        setDownloadSpeed(0)
      }
    }
    const unsubscribe = onMessage(handler)
    return unsubscribe
  }, [onMessage, setDownloadProgress, setModelStatus])

  const handleDownload = async () => {
    try {
      setModelStatus('downloading')
      setDownloadProgress(0)
      setDownloadSpeed(0)
      await window.api.model.download()
    } catch {
      setModelStatus('failed')
    }
  }

  const handleCancel = async () => {
    await window.api.model.cancelDownload()
    setModelStatus('default')
    setDownloadProgress(0)
    setDownloadSpeed(0)
  }

  const handleSelectExisting = async () => {
    const result = await window.api.dialog.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0]
      setSelectError('')
      try {
        const info = await window.api.model.adoptModelFolder(selectedPath)
        useAppStore.getState().setModelFolder({ path: info.path, size: info.size })
        setModelStatus('complete')
        setDownloadProgress(100)
      } catch (err) {
        setSelectError(err instanceof Error ? err.message : 'Invalid model folder')
      }
    }
  }

  const handleSetDownloadLocation = async () => {
    const result = await window.api.dialog.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      const newDataDir = result.filePaths[0]
      try {
        await window.api.model.moveFolder(newDataDir)
        setDownloadLocation(newDataDir)
        try {
          const folderResult = await window.api.model.getFolderInfo()
          if (folderResult) {
            useAppStore
              .getState()
              .setModelFolder({ path: folderResult.path, size: folderResult.size })
          }
        } catch {
          useAppStore.getState().setModelFolder(null)
        }
      } catch (err) {
        setSelectError(err instanceof Error ? err.message : 'Failed to set download location')
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border p-4">
        <div className="flex items-start gap-3">
          <input checked className="mt-0.5 size-4" readOnly type="radio" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">CLIP ViT-B/32</p>
                  {modelStatus === 'complete' && (
                    <Badge variant="secondary" className="text-xs text-primary">
                      Ready
                    </Badge>
                  )}
                  {modelStatus === 'downloading' && (
                    <Badge variant="secondary" className="text-xs">
                      Downloading
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  General-purpose image & text embeddings. Fast, well-tested, works great for most
                  libraries.
                </p>

                <p className="font-mono text-xs text-muted-foreground">
                  512-dim · ~650 MB · ViT-B/32{device && ` · ${device.toUpperCase()}`}
                </p>

                {(downloadLocation || modelFolder) && (
                  <>
                    <Separator className="my-2" />
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {modelFolder && (
                        <div className="flex items-center gap-1">
                          <FolderOpenIcon className="shrink-0" size={12} />
                          <span className="shrink-0">Path:</span>
                          <span className="font-mono truncate">{modelFolder.path}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {modelStatus === 'downloading' && (
                  <div className="mt-3 space-y-1">
                    <Progress value={downloadProgress} className="h-1.5" />
                    <p className="font-mono text-xs text-muted-foreground">
                      {Math.round(downloadProgress)}%
                      {downloadSpeed > 0 && ` · ${downloadSpeed} MB/s`}
                    </p>
                  </div>
                )}

                {modelStatus === 'failed' && (
                  <Alert variant="destructive" className="mt-2 py-2 px-3">
                    <WarningIcon size={14} />
                    <AlertDescription className="text-xs">
                      Download failed.{' '}
                      <button className="underline" onClick={handleDownload}>
                        Retry
                      </button>
                    </AlertDescription>
                  </Alert>
                )}

                {selectError && (
                  <Alert variant="destructive" className="mt-2 py-2 px-3">
                    <WarningIcon size={14} />
                    <AlertDescription className="text-xs">{selectError}</AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 shrink-0">
                {modelStatus === 'default' && (
                  <>
                    <Button size="sm" variant="outline" onClick={handleSelectExisting}>
                      <FolderOpenIcon className="mr-1 size-3" /> Select Existing
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleSetDownloadLocation}>
                      <HardDriveIcon className="mr-1 size-3" /> Change Location
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownload}>
                      <DownloadSimpleIcon className="mr-1 size-3" /> Download
                    </Button>
                  </>
                )}
                {modelStatus === 'downloading' && (
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                )}
                {modelStatus === 'complete' && (
                  <Button size="sm" variant="outline" disabled>
                    Downloaded
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Coming soon</p>
        <div className="rounded-md border border-border bg-muted/30 p-4 opacity-50">
          <p className="text-sm">CLIP ViT-L/14</p>
          <p className="mt-1 text-xs text-muted-foreground">Higher accuracy, larger model</p>
        </div>
        <div className="rounded-md border border-border bg-muted/30 p-4 opacity-50">
          <p className="text-sm">SigLIP</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Google&apos;s improved vision-language model
          </p>
        </div>
      </div>
    </div>
  )
}
