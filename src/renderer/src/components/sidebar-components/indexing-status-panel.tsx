import { useState, useEffect } from 'react'
import {
  ImagesIcon,
  PlayIcon,
  StopIcon,
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  CircleDashedIcon
} from '@phosphor-icons/react'
import { useAppStore } from '@/stores/app-store'
import { useBackendEvents } from '@/hooks/use-backend-events'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type IndexingState = 'idle' | 'running' | 'paused' | 'complete'

interface IndexingStatus {
  indexed: number
  imgsPerSec: number
  state: IndexingState
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-sidebar-foreground">{value}</span>
    </div>
  )
}

function StateBadge({ state }: { state: IndexingState }) {
  const isRunning = state === 'running'
  const isComplete = state === 'complete'
  const isPaused = state === 'paused'

  const className = isComplete
    ? 'bg-green-500/15 text-green-500 hover:bg-green-500/20 border-transparent'
    : isRunning
      ? 'bg-cyan-500/15 text-cyan-500 hover:bg-cyan-500/20 border-transparent'
      : isPaused
        ? 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-transparent'
        : 'border-transparent'

  const label =
    state === 'idle' ? 'Idle' : state === 'paused' ? 'Paused' : isComplete ? 'Done' : 'Running'

  return (
    <Badge
      variant="secondary"
      className={`gap-1 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${className}`}
    >
      {isComplete ? (
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

export function IndexingStatusPanel() {
  const rootFolder = useAppStore((s) => s.rootFolder)
  const folderStats = useAppStore((s) => s.folderStats)
  const { onMessage } = useBackendEvents()

  const [status, setStatus] = useState<IndexingStatus>({
    indexed: 0,
    imgsPerSec: 0,
    state: 'idle'
  })

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

  // Restore state from backend on mount or when root folder changes
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

  return (
    <div className="flex flex-col gap-3 px-2 py-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImagesIcon size={16} className="shrink-0 text-sidebar-foreground" />
          <span className="text-primary text-sm">Index Status</span>
        </div>
        <StateBadge state={effectiveState} />
      </div>

      <Progress value={pct} className="h-1.5" />

      <div className="flex flex-col gap-1">
        <StatRow
          label="Indexed"
          value={`${safeIndexed.toLocaleString()} / ${displayTotal.toLocaleString()}`}
        />
        <StatRow label="Remaining" value={remaining > 0 ? remaining.toLocaleString() : '—'} />
        <StatRow label="Progress" value={`${pct}%`} />
      </div>

      <Separator />

      {isRunning ? (
        <Button variant="destructive" size="sm" className="w-full h-7 text-xs" onClick={handleStop}>
          <StopIcon size={12} weight="fill" />
          Stop
        </Button>
      ) : showReindex ? (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleReindex}>
          <ArrowCounterClockwiseIcon size={12} />
          Re-index All
        </Button>
      ) : (
        <Button variant="default" size="sm" className="w-full h-7 text-xs" onClick={handleStart}>
          <PlayIcon size={12} weight="fill" />
          {effectiveComplete ? 'Index New' : 'Start'}
        </Button>
      )}
    </div>
  )
}
