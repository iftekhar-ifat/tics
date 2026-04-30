import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useAppStore } from '@/stores/app-store'
import { useBackendEvents } from '@/hooks/use-backend-events'
import { Button } from '@/components/ui/button'

export function Step03Model(): React.JSX.Element {
  const { setModelStatus, setDownloadProgress } = useOnboardingStore()
  const modelStatus = useAppStore((s) => s.modelStatus)
  const downloadProgress = useAppStore((s) => s.downloadProgress)

  const { onMessage } = useBackendEvents()
  const [device, setDevice] = useState<string>('')
  const [downloadSpeed, setDownloadSpeed] = useState<number>(0)

  useEffect(() => {
    const loadModelFolderInfo = async () => {
      try {
        const folderResult = await window.api.model.getFolderInfo()
        if (folderResult) {
          useAppStore.getState().setModelFolder({
            path: folderResult.path,
            size: folderResult.size
          })
        }
      } catch {
        // ignore folder info errors
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
        // backend not ready
      }
    }

    const init = async () => {
      await checkStatus()
      await loadModelFolderInfo()
    }

    void init()
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
            useAppStore.getState().setModelFolder({
              path: folderResult.path,
              size: folderResult.size
            })
          }
        } catch {
          // ignore folder info errors
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
        console.error('Model download error:', eventData)
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

  const handleRetry = () => {
    void handleDownload()
  }

  const handleCancel = async () => {
    await window.api.model.cancelDownload()
    setModelStatus('default')
    setDownloadProgress(0)
    setDownloadSpeed(0)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border p-4">
        <div className="flex items-start gap-3">
          <input checked className="mt-0.5 size-4" readOnly type="radio" />
          <div className="flex-1">
            <p className="font-medium text-sm">CLIP ViT-B/32</p>
            <p className="mt-1 text-xs text-muted-foreground">
              General-purpose image & text embeddings. Fast, well-tested, works great for most
              libraries.
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              512-dim · ~650 MB · ViT-B/32
              {device && ` · ${device.toUpperCase()}`}
            </p>

            {modelStatus === 'downloading' && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {Math.round(downloadProgress)}%{downloadSpeed > 0 && ` · ${downloadSpeed} MB/s`}
                </p>
              </div>
            )}

            {modelStatus === 'failed' && (
              <p className="mt-2 text-xs text-destructive">
                Download failed.{' '}
                <button className="underline" onClick={handleRetry}>
                  Retry
                </button>
              </p>
            )}

            {modelStatus === 'complete' && (
              <p className="mt-2 font-mono text-xs text-primary">Ready</p>
            )}
          </div>

          <div className="ml-auto">
            {modelStatus === 'default' && (
              <Button size="sm" variant="outline" onClick={handleDownload}>
                Download
              </Button>
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