import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores/app-store'

export function SplashScreen(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const { setAppReady } = useAppStore()

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setError('Failed to connect to backend')
      }
    }, 15000)

    const unsubscribe = window.api.backend.onStatusChanged((status) => {
      if (status.status === 'running' && !cancelled) {
        clearTimeout(timeout)
        setAppReady(true)
      }
    })

    return () => {
      cancelled = true
      clearTimeout(timeout)
      unsubscribe()
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
