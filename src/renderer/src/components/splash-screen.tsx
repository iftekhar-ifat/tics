import { useEffect, useState, useRef, useCallback } from 'react'
import { useAppStore } from '@/stores/app-store'

export function SplashScreen(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null)
  const { setAppReady } = useAppStore()
  const wsRef = useRef<WebSocket | null>(null)

  const connectWebSocket = useCallback(async () => {
    try {
      const status = await window.api.backend.getStatus()
      if (!status.url) return null

      const wsUrl = status.url.replace('http', 'ws') + '/ws'
      const ws = new WebSocket(wsUrl)

      return new Promise<WebSocket>((resolve, reject) => {
        ws.onopen = () => resolve(ws)
        ws.onerror = () => reject(new Error('WS error'))
        ws.onclose = () => reject(new Error('WS closed'))
      })
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const init = async (): Promise<void> => {
      let retries = 0
      const maxRetries = 30

      while (retries < maxRetries && !cancelled) {
        try {
          const status = await window.api.backend.getStatus()
          if (status.status === 'running') {
            try {
              wsRef.current = await connectWebSocket()
            } catch {
              // WS connection not critical
            }

            if (!cancelled) {
              setAppReady(true)
            }
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
      wsRef.current?.close()
    }
  }, [setAppReady, connectWebSocket])

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
