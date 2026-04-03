import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores/app-store'

export function SplashScreen(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const { setAppReady } = useAppStore()

  useEffect(() => {
    let cancelled = false

    const init = async (): Promise<void> => {
      let retries = 0
      const maxRetries = 30

      while (retries < maxRetries && !cancelled) {
        try {
          const status = await window.api.backend.getStatus()
          if (status.status === 'running' && !cancelled) {
            setAppReady(true)
            return
          }
        } catch {
          // ignore
        }

        retries++
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      if (!cancelled) {
        setError('Failed to connect to backend')
      }
    }

    void init()

    return () => {
      cancelled = true
    }
  }, [setAppReady])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="text-center">
        {!error && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            <p className="text-sm text-muted-foreground">Connecting to backend...</p>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
