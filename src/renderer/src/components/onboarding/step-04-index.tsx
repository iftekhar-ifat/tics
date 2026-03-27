import { useEffect, useState } from 'react'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'

interface Step04IndexProps {
  onComplete: () => void
}

export function Step04Index({ onComplete }: Step04IndexProps): React.JSX.Element {
  const {
    folderInfo,
    indexingProgress,
    setIndexingProgress,
    indexingComplete,
    setIndexingComplete
  } = useOnboardingStore()
  const [isIndexing, setIsIndexing] = useState(false)

  const totalImages = folderInfo?.imageCount ?? 3421

  const handleStartIndexing = () => {
    setIsIndexing(true)
    setIndexingProgress(0)
  }

  const handleSkip = () => {
    onComplete()
  }

  const handleContinue = () => {
    onComplete()
  }

  useEffect(() => {
    if (isIndexing && !indexingComplete) {
      const interval = setInterval(() => {
        setIndexingProgress(indexingProgress + 100)
        if (indexingProgress >= totalImages) {
          setIndexingComplete(true)
          clearInterval(interval)
        }
      }, 50)
      return () => clearInterval(interval)
    }
    return undefined
  }, [
    isIndexing,
    indexingProgress,
    indexingComplete,
    totalImages,
    setIndexingProgress,
    setIndexingComplete
  ])

  if (isIndexing || indexingComplete) {
    const progress = Math.min(indexingProgress, totalImages)
    const percentage = Math.round((progress / totalImages) * 100)

    return (
      <div className="space-y-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {progress.toLocaleString()} / {totalImages.toLocaleString()}
          {indexingComplete ? ' · Done' : ` · ${percentage}%`}
        </p>
        {indexingComplete ? (
          <Button onClick={onComplete}>Go to App</Button>
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
      <div className="flex gap-3">
        <Button onClick={handleStartIndexing}>Start Indexing</Button>
        <Button variant="ghost" onClick={handleSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}
