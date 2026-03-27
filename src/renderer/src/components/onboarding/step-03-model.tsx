import { useEffect } from 'react'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'

export function Step03Model(): React.JSX.Element {
  const { modelStatus, setModelStatus, setDownloadProgress, downloadProgress } =
    useOnboardingStore()

  const handleDownload = () => {
    setModelStatus('downloading')
    setDownloadProgress(0)
  }

  const handleRetry = () => {
    setModelStatus('downloading')
    setDownloadProgress(0)
  }

  useEffect(() => {
    if (modelStatus === 'downloading') {
      const interval = setInterval(() => {
        setDownloadProgress(downloadProgress + 10)
        if (downloadProgress >= 100) {
          setModelStatus('complete')
          clearInterval(interval)
        }
      }, 200)
      return () => clearInterval(interval)
    }
    return undefined
  }, [modelStatus, downloadProgress, setDownloadProgress, setModelStatus])

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
              512-dim · ~350 MB · ViT-B/32
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
                  {downloadProgress}% · Downloading...
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
              <Button size="sm" variant="outline" disabled>
                Downloading...
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
