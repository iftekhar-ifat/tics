import { CheckCircleIcon, CircleDashedIcon } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { IndexingState } from '@/hooks/use-indexing'

export function StatRow({
  label,
  value,
  size = 'sm'
}: {
  label: string
  value: string
  size?: 'sm' | 'xs'
}) {
  return (
    <div className={`flex items-center justify-between ${size === 'xs' ? 'text-xs' : 'text-sm'}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-sidebar-foreground">{value}</span>
    </div>
  )
}

export function StateBadge({ state, size = 'xs' }: { state: IndexingState; size?: 'xs' | 'sm' }) {
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

  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs'

  return (
    <Badge
      variant="secondary"
      className={`gap-1 px-1.5 py-0.5 font-mono ${textSize} uppercase tracking-wider ${className}`}
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
