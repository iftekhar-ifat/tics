import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useAppStore } from '@/stores/app-store'
import { useBackendEvents } from '@/hooks/use-backend-events'
import { Button } from '@/components/ui/button'
import { Progress } from '../ui/progress'

export function Step04Index(): React.JSX.Element {
  const { setIndexingProgress, setIndexingComplete, completeOnboarding } = useOnboardingStore()
  const rootFolder = useAppStore((s) => s.rootFolder)
  const folderStats = useAppStore((s) => s.folderStats)
  const indexingProgress = useAppStore((s) => s.indexingProgress)
  const indexingComplete = useAppStore((s) => s.indexingComplete)
  const [isIndexing, setIsIndexing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { onMessage } = useBackendEvents()

  const totalImages = folderStats.imageCount

  const handleStartIndexing = async () => {
    if (!rootFolder) return
    setIsIndexing(true)
    setError(null)
    setIndexingProgress(0)
    setIndexingComplete(false)

    try {
      const result = await window.api.indexing.start(rootFolder.path, totalImages)
      if (!result.ok) {
        setError(result.message ?? 'Failed to start indexing')
        setIsIndexing(false)
      }
    } catch (err) {
      setError(String(err))
      setIsIndexing(false)
    }
  }

  const handleSkip = () => {
    completeOnboarding()
  }

  const handleContinue = () => {
    completeOnboarding()
  }

  useEffect(() => {
    const unsub = onMessage((data: unknown) => {
      const event = data as { type: string; data: { indexed?: number; total?: number } }
      if (event.type === 'indexing_progress') {
        setIndexingProgress(event.data.indexed ?? 0)
      } else if (event.type === 'indexing_complete') {
        setIndexingProgress(event.data.indexed ?? totalImages)
        setIndexingComplete(true)
      } else if (event.type === 'indexing_error') {
        setError('Indexing was cancelled or failed')
        setIsIndexing(false)
      }
    })
    return unsub
  }, [onMessage, setIndexingProgress, setIndexingComplete, totalImages])

  if (isIndexing || indexingComplete) {
    const progress = Math.min(indexingProgress, totalImages)
    const percentage = totalImages > 0 ? Math.round((progress / totalImages) * 100) : 0

    return (
      <div className="space-y-4">
        <Progress value={percentage} />
        <p className="font-mono text-xs text-muted-foreground">
          {progress.toLocaleString()} / {totalImages.toLocaleString()}
          {indexingComplete ? ' · Done' : ` · ${percentage}%`}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {indexingComplete ? (
          <Button onClick={completeOnboarding}>Go to App</Button>
        ) : (
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={handleContinue}
            type="button"
          >
            Continue to app
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium text-sm">Your library is ready to index</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Indexing lets Tics search your images. You can start now or do it later.
        </p>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button onClick={handleStartIndexing} disabled={totalImages === 0}>
          Start Indexing
        </Button>
        <Button variant="ghost" onClick={handleSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}
