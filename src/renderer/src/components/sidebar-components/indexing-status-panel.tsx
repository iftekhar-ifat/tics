import { ImagesIcon, PlayIcon, StopIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import { IndexingState, useIndexing } from '@/hooks/use-indexing'
import { StatRow, StateBadge } from '@/components/indexing/shared'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

export function IndexingStatusPanel() {
  const {
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
  } = useIndexing()

  return (
    <div className="flex flex-col gap-3 px-2 py-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ImagesIcon size={16} className="shrink-0 text-sidebar-foreground" />
          <span className="text-primary text-sm">Index Status</span>
        </div>
        <StateBadge state={effectiveState as IndexingState} size="xs" />
      </div>

      <Progress value={pct} className="h-1.5" />

      <div className="flex flex-col gap-1">
        <StatRow
          label="Indexed"
          value={`${safeIndexed.toLocaleString()} / ${displayTotal.toLocaleString()}`}
          size="xs"
        />
        <StatRow
          label="Remaining"
          value={remaining > 0 ? remaining.toLocaleString() : '—'}
          size="xs"
        />
        <StatRow label="Progress" value={`${pct}%`} size="xs" />
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
