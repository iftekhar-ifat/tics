import { useEffect, useState } from 'react'
import { useAppStore } from '@/stores/app-store'

export function useBackendReady() {
  const { setAppReady } = useAppStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) setError('Failed to connect to backend')
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

  return { error }
}
