import { useCallback, useEffect, useRef, useState } from 'react'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'

export function Step03Model(): React.JSX.Element {
  const { modelStatus, setModelStatus, downloadProgress, setDownloadProgress } =
    useOnboardingStore()

  const [device, setDevice] = useState<string>('')
  const [downloadSpeed, setDownloadSpeed] = useState<number>(0)
  const wsRef = useRef<WebSocket | null>(null)

  const connectWebSocket = useCallback(async () => {
    try {
      const status = await window.api.backend.getStatus()
      if (!status.url) return

      const wsUrl = status.url.replace('http', 'ws') + '/ws'
      const ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'model_download') {
            setDownloadProgress(msg.percent ?? 0)
            setDownloadSpeed(msg.speed ?? 0)
          }
          if (msg.type === 'model_download_complete') {
            setModelStatus('complete')
            setDownloadProgress(100)
            setDownloadSpeed(0)
          }
          if (msg.type === 'model_download_cancelled') {
            setModelStatus('default')
            setDownloadProgress(0)
            setDownloadSpeed(0)
          }
        } catch {
          // ignore non-JSON messages
        }
      }

      ws.onclose = () => {
        wsRef.current = null
      }

      wsRef.current = ws
    } catch {
      // backend not reachable yet
    }
  }, [setDownloadProgress, setModelStatus])

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await window.api.model.getStatus()
        if (result.ok && result.data?.ready) {
          setModelStatus('complete')
          setDownloadProgress(100)
          if (result.data.device) setDevice(result.data.device)
          return
        }
        if (result.data?.device) setDevice(result.data.device)
      } catch {
        // backend not ready
      }
    }

    void checkStatus()
    void connectWebSocket()

    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connectWebSocket, setDownloadProgress, setModelStatus])

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
