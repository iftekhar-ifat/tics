'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FolderIcon,
  ImageIcon,
  PlayIcon,
  StopIcon,
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  CircleDashedIcon,
  PlusCircleIcon
} from '@phosphor-icons/react'
import { useAppStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type IndexingState = 'idle' | 'running' | 'paused' | 'complete'

interface IndexingStatus {
  indexed: number
  total: number
  imgsPerSec: number
  state: IndexingState
  newImages: number
}

const MOCK_TOTAL = 4821
const TICK_INTERVAL_MS = 80
const IMGS_PER_TICK = 6
const MOCK_NEW_IMAGES_DELAY_MS = 3000
const MOCK_NEW_IMAGES_COUNT = 17

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
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
      className={`gap-1 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${className}`}
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

export function FoldersSection(): React.JSX.Element {
  const { rootFolder, setRootFolder } = useAppStore()
  const [status, setStatus] = useState<IndexingStatus>({
    indexed: 0,
    total: MOCK_TOTAL,
    imgsPerSec: 0,
    state: 'idle',
    newImages: 0
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const newImagesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startTick = useCallback(() => {
    clearTick()
    intervalRef.current = setInterval(() => {
      setStatus((prev) => {
        if (prev.state !== 'running') return prev
        const next = Math.min(prev.indexed + IMGS_PER_TICK, prev.total)
        const done = next >= prev.total
        return {
          ...prev,
          indexed: next,
          imgsPerSec: done ? 0 : Math.round((1000 / TICK_INTERVAL_MS) * IMGS_PER_TICK),
          state: done ? 'complete' : 'running'
        }
      })
    }, TICK_INTERVAL_MS)
  }, [clearTick])

  useEffect(() => {
    if (status.state === 'complete' && status.newImages === 0) {
      newImagesTimerRef.current = setTimeout(() => {
        setStatus((p) => ({ ...p, newImages: MOCK_NEW_IMAGES_COUNT }))
      }, MOCK_NEW_IMAGES_DELAY_MS)
    }
    return () => {
      if (newImagesTimerRef.current) clearTimeout(newImagesTimerRef.current)
    }
  }, [status.state, status.newImages])

  useEffect(() => {
    if (status.state === 'running') startTick()
    else clearTick()
    return clearTick
  }, [status.state, startTick, clearTick])

  const handleStart = () => setStatus((p) => ({ ...p, state: 'running' }))
  const handleStop = () => setStatus((p) => ({ ...p, state: 'paused', imgsPerSec: 0 }))

  const handleReindex = () => {
    clearTick()
    setStatus({ indexed: 0, total: MOCK_TOTAL, imgsPerSec: 0, state: 'idle', newImages: 0 })
  }

  const handleIndexNew = () => {
    setStatus((p) => ({
      ...p,
      total: p.indexed + p.newImages,
      newImages: 0,
      state: 'running'
    }))
  }

  const handleChangeFolder = async () => {
    const result = await window.api.dialog.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      const name = path.split(/[\\/]/).pop() || path
      const scanResult = await window.api.folder.scanFolder(path)
      setRootFolder({
        path,
        name,
        imageCount: scanResult.imageCount,
        totalSize: scanResult.totalSize
      })
    }
  }

  const { indexed, total, state, newImages } = status
  const remaining = total - indexed
  const pct = total > 0 ? Math.round((indexed / total) * 100) : 0
  const isRunning = state === 'running'
  const isComplete = state === 'complete'
  const hasNew = isComplete && newImages > 0

  return (
    <Card className="rounded-none border-b-0 border-x-0 bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 px-4 py-3">
        <CardTitle className="text-sm">Library Folder</CardTitle>
        <Button
          variant="outline"
          size="xs"
          onClick={handleChangeFolder}
          className="h-7 gap-1 rounded-none border px-2 text-xs"
        >
          <FolderIcon className="size-3" />
          {rootFolder ? 'Change Folder' : 'Choose Folder'}
        </Button>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <FolderIcon className="size-4 shrink-0" />
          <span className="truncate">
            {rootFolder?.path || (
              <span className="text-muted-foreground/60">No folder selected</span>
            )}
          </span>
        </div>
        {rootFolder && (
          <div className="mt-3 flex flex-col gap-3 rounded-none border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ImageIcon size={16} className="shrink-0 text-sidebar-foreground" />
                <span className="text-primary text-sm">Index Status</span>
              </div>
              <StateBadge state={state} newImages={newImages} />
            </div>

            <Progress value={pct} className="h-1.5" />

            <div className="flex flex-col gap-1">
              <StatRow
                label="Indexed"
                value={`${indexed.toLocaleString()} / ${total.toLocaleString()}`}
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
        )}
      </CardContent>
    </Card>
  )
}
