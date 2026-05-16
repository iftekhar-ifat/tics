import { useState, useEffect, useRef } from 'react'
import {
  ImagesIcon,
  PlayIcon,
  StopIcon,
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  PlusCircleIcon,
  FileImageIcon
} from '@phosphor-icons/react'
import { useAppStore } from '@/stores/app-store'
import { useBackendEvents } from '@/hooks/use-backend-events'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

type IndexingState = 'idle' | 'running' | 'paused' | 'complete'

interface IndexingStatus {
  indexed: number
  imgsPerSec: number
  state: IndexingState
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-sidebar-foreground">{value}</span>
    </div>
  )
}

function StateBadge({ state, newImages }: { state: IndexingState; newImages: number }) {
  const isRunning = state === 'running'
  const isComplete = state === 'complete'
  const isPaused = state === 'paused'
  const hasNew = isComplete && newImages > 0

  const className = hasNew
    ? 'bg-violet-500/15 text-violet-500 hover:bg-violet-500/20 border-transparent'
    : isComplete
      ? 'bg-green-500/15 text-green-500 hover:bg-green-500/20 border-transparent'
      : isRunning
        ? 'bg-cyan-500/15 text-cyan-500 hover:bg-cyan-500/20 border-transparent'
        : isPaused
          ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-transparent'
          : 'border-transparent'

  const label = hasNew
    ? 'New'
    : state === 'idle'
      ? 'Idle'
      : state === 'paused'
        ? 'Paused'
        : isComplete
          ? 'Done'
          : 'Running'

  return (
    <Badge
      variant="secondary"
      className={`gap-1 px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider ${className}`}
    >
      {hasNew ? (
        <PlusCircleIcon size={12} weight="bold" />
      ) : isComplete ? (
        <CheckCircleIcon size={12} weight="fill" />
      ) : isRunning ? (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-500" />
        </span>
      ) : (
        <CircleDashedIcon size={12} />
      )}
      {label}
    </Badge>
  )
}

export function IndexingSettings() {
  const rootFolder = useAppStore((s) => s.rootFolder)
  const folderStats = useAppStore((s) => s.folderStats)
  const indexedBaseline = useAppStore((s) => s.indexedBaseline)
  const setIndexedBaseline = useAppStore((s) => s.setIndexedBaseline)
  const { onMessage } = useBackendEvents()

  const [status, setStatus] = useState<IndexingStatus>({
    indexed: 0,
    imgsPerSec: 0,
    state: 'idle'
  })

  // Ref for folderStats.imageCount to avoid re-subscribing on every update
  const folderImageCountRef = useRef(folderStats.imageCount)
  useEffect(() => {
    folderImageCountRef.current = folderStats.imageCount
  }, [folderStats.imageCount])

  // Subscribe to backend indexing events (stable subscription)
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
        setIndexedBaseline(folderImageCountRef.current)
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
  }, [onMessage, setIndexedBaseline])

  // Get initial state from backend on mount
  useEffect(() => {
    window.api.indexing.getStatus().then((result) => {
      if (result.ok && result.data) {
        setStatus((prev) => ({
          ...prev,
          state: result.data!.state,
          indexed: result.data!.indexed
        }))
      }
    })
  }, [])

  const handleStart = async () => {
    if (!rootFolder) return
    setStatus((prev) => ({ ...prev, indexed: 0, state: 'running' }))
    const result = await window.api.indexing.start(rootFolder.path, folderStats.imageCount)
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
    setIndexedBaseline(0)
    setStatus({
      indexed: 0,
      state: 'idle',
      imgsPerSec: 0
    })
  }

  const handleIndexNew = async () => {
    if (!rootFolder) return
    setStatus((prev) => ({
      ...prev,
      indexed: indexedBaseline,
      state: 'running'
    }))
    const result = await window.api.indexing.start(
      rootFolder.path,
      folderStats.imageCount,
      indexedBaseline
    )
    if (!result.ok) {
      setStatus((prev) => ({ ...prev, state: 'idle' }))
    }
  }

  const { indexed, state } = status
  const newImages = Math.max(0, folderStats.imageCount - indexedBaseline)
  const displayTotal = folderStats.imageCount || 0
  const safeIndexed = Math.min(indexed, displayTotal)
  const remaining = displayTotal - safeIndexed
  const pct = displayTotal > 0 ? Math.round((safeIndexed / displayTotal) * 100) : 0
  const isRunning = state === 'running'
  const isComplete = state === 'complete'
  const hasNew = isComplete && newImages > 0

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle className="flex gap-2 items-center text-base">
          <FileImageIcon className="text-muted-foreground" size={24} /> Image Index
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-1">
        <div className="flex flex-col gap-3 px-2 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ImagesIcon size={20} className="shrink-0 text-sidebar-foreground" />
              <span className="font-mono text-primary text-sm">Index Status</span>
            </div>
            <StateBadge state={state} newImages={newImages} />
          </div>

          <Progress value={pct} className="h-1.5" />

          <div className="flex flex-col gap-1">
            <StatRow
              label="Indexed"
              value={`${safeIndexed.toLocaleString()} / ${displayTotal.toLocaleString()}`}
            />
            <StatRow label="Remaining" value={remaining > 0 ? remaining.toLocaleString() : '—'} />
            <StatRow label="Progress" value={`${pct}%`} />
            {hasNew && <StatRow label="New images" value={`+${newImages.toLocaleString()}`} />}
          </div>

          <Separator />

          {!isComplete && (
            <Button
              variant={isRunning ? 'destructive' : 'default'}
              size="sm"
              className="w-full h-7 text-xs"
              onClick={isRunning ? handleStop : handleStart}
            >
              {isRunning ? (
                <>
                  <StopIcon size={12} weight="fill" />
                  Stop
                </>
              ) : (
                <>
                  <PlayIcon size={12} weight="fill" />
                  {state === 'paused' ? 'Resume' : 'Start'}
                </>
              )}
            </Button>
          )}

          {isComplete && (
            <div className="flex flex-col gap-1.5">
              {hasNew && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full text-xs"
                  onClick={handleIndexNew}
                >
                  <PlusCircleIcon size={12} />
                  Index New ({newImages})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleReindex}
              >
                <ArrowCounterClockwiseIcon size={12} />
                Re-index All
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
