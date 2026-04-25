import { useOnboardingStore } from '@/stores/onboarding-store'
import {
  CpuIcon,
  HardDriveIcon,
  MonitorIcon,
  DeviceMobileIcon,
  SpinnerIcon
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { InferenceDevice } from '@/stores/onboarding-store'

const DEVICE_CONFIG: Record<InferenceDevice, { label: string; className: string }> = {
  cuda: { label: 'CUDA', className: 'text-green-500' },
  mps: { label: 'MPS', className: 'text-purple-500' },
  cpu: { label: 'CPU', className: 'text-blue-500' }
}

function OsIcon({ os }: { os: string }) {
  const lower = os.toLowerCase()
  if (lower.includes('mac') || lower.includes('darwin')) return <DeviceMobileIcon size={12} />
  return <MonitorIcon size={12} />
}

export function HardwareInfoPanel() {
  const hardwareInfo = useOnboardingStore((s) => s.hardwareInfo)

  if (!hardwareInfo) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-2 text-xs text-muted-foreground">
        <SpinnerIcon className="h-4 w-4 animate-spin text-sidebar-foreground/50" />
        <span>Detecting hardware...</span>
      </div>
    )
  }

  const { os, inferenceDevice, deviceName, availableMemory } = hardwareInfo
  const device = DEVICE_CONFIG[inferenceDevice]

  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-sidebar-accent/40 px-2 py-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <OsIcon os={os} />
          <span className="truncate">{os}</span>
        </div>
        <span className={cn('font-mono font-medium shrink-0', device.className)}>
          {device.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 min-w-0">
        <CpuIcon size={12} className="shrink-0" />
        <span className="truncate">{deviceName}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <HardDriveIcon size={12} className="shrink-0" />
        <span>{availableMemory} available</span>
      </div>
    </div>
  )
}
