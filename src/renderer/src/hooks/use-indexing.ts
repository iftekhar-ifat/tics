import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'
import { useBackendEvents } from '@/hooks/use-backend-events'

export type IndexingState = 'idle' | 'running' | 'paused' | 'complete'

interface IndexingStatus {
  indexed: number
  imgsPerSec: number
  state: IndexingState
}

export function useIndexing() {
  const rootFolder = useAppStore((s) => s.rootFolder)
  const folderStats = useAppStore((s) => s.folderStats)
  const { onMessage } = useBackendEvents()

  const [status, setStatus] = useState<IndexingStatus>({
    indexed: 0,
    imgsPerSec: 0,
    state: 'idle'
  })

  useEffect(() => {
    const unsub = onMessage((data: unknown) => {
      const event = data as {
        type: string
        data: {
          indexed?: number
          imgsPerSec?: number
        }
      }

      if (event.type === 'indexing_progress') {
        setStatus((prev) => ({
          ...prev,
          indexed: event.data.indexed ?? prev.indexed,
          imgsPerSec: event.data.imgsPerSec ?? 0,
          state: 'running'
        }))
      } else if (event.type === 'indexing_complete') {
        setStatus((prev) => ({
          ...prev,
          indexed: event.data.indexed ?? prev.indexed,
          state: 'complete',
          imgsPerSec: 0
        }))
      } else if (event.type === 'indexing_error') {
        setStatus((prev) => ({ ...prev, state: 'idle', imgsPerSec: 0 }))
      }
    })
    return unsub
  }, [onMessage])

  useEffect(() => {
    if (!rootFolder?.path) return
    window.api.indexing.getStatus(rootFolder.path).then((result) => {
      if (result.ok && result.data) {
        setStatus((prev) => ({
          ...prev,
          state: result.data!.state,
          indexed: result.data!.indexed
        }))
      }
    })
  }, [rootFolder?.path])

  const handleStart = async () => {
    if (!rootFolder) return
    const offset = status.indexed
    setStatus((prev) => ({ ...prev, state: 'running' }))
    const result = await window.api.indexing.start(rootFolder.path, folderStats.imageCount, offset)
    if (!result.ok) {
      setStatus((prev) => ({ ...prev, state: 'idle' }))
    }
  }

  const handleStop = async () => {
    await window.api.indexing.cancel()
    setStatus((prev) => ({ ...prev, state: 'idle', imgsPerSec: 0 }))
  }

  const handleReindex = async () => {
    if (!rootFolder) return
    await window.api.indexing.clear(rootFolder.path)
    setStatus({
      indexed: 0,
      state: 'idle',
      imgsPerSec: 0
    })
  }

  const { indexed, state: rawState } = status
  const displayTotal = folderStats.imageCount || 0
  const safeIndexed = Math.min(indexed, displayTotal)
  const remaining = displayTotal - safeIndexed
  const pct = displayTotal > 0 ? Math.round((safeIndexed / displayTotal) * 100) : 0
  const isRunning = rawState === 'running'
  const effectiveComplete = rawState === 'complete' && safeIndexed >= displayTotal
  const showReindex = !isRunning && safeIndexed >= displayTotal
  const effectiveState = effectiveComplete ? 'complete' : isRunning ? 'running' : 'idle'

  return {
    status,
    safeIndexed,
    displayTotal,
    remaining,
    pct,
    isRunning,
    effectiveComplete,
    showReindex,
    effectiveState,
    handleStart,
    handleStop,
    handleReindex
  }
}
