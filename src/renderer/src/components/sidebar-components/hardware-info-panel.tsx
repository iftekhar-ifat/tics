import { useAppStore } from '@/stores/app-store'
import { useOnboardingStore } from '@/stores/onboarding-store'
import {
  CpuIcon,
  HardDriveIcon,
  MonitorIcon,
  SpinnerIcon,
  GraphicsCardIcon,
  WarningIcon,
  ArrowCounterClockwiseIcon
} from '@phosphor-icons/react'
import type { InferenceDevice } from '@/stores/onboarding-store'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const HARDWARE_TIMEOUT_MS = 2000

const DEVICE_CONFIG: Record<InferenceDevice, { label: string; icon: React.ReactNode }> = {
  cuda: { label: 'CUDA', icon: <GraphicsCardIcon size={16} className="shrink-0 text-green-500" /> },
  mps: { label: 'MPS', icon: <CpuIcon size={16} className="shrink-0 text-purple-500" /> },
  cpu: { label: 'CPU', icon: <CpuIcon size={16} className="shrink-0 text-blue-500" /> }
}

export function HardwareInfoPanel() {
  const hardwareInfo = useAppStore((s) => s.hardwareInfo)
  const detect = useOnboardingStore((s) => s.detectHardware)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (hardwareInfo) return
    const timer = setTimeout(() => setTimedOut(true), HARDWARE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [hardwareInfo])

  if (!hardwareInfo) {
    if (timedOut) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-xs text-center">
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-1 text-amber-600 dark:text-amber-400">
              <WarningIcon size={16} className="shrink-0" />
              <span className="font-medium">Hardware detection failed</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">Try to detect hardware.</p>
          </div>
          <Button variant="outline" size="sm" onClick={detect} className="flex items-center gap-1">
            <ArrowCounterClockwiseIcon size={16} />
            Detect
          </Button>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <SpinnerIcon className="h-4 w-4 animate-spin text-sidebar-foreground" />
        <span>Checking hardware...</span>
      </div>
    )
  }

  const { os, inferenceDevice, deviceName, availableMemory } = hardwareInfo
  const device = DEVICE_CONFIG[inferenceDevice]

  return (
    <div className="flex flex-col justify-center gap-2.5 rounded-md px-2 py-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5 min-w-0">
        <MonitorIcon size={16} className="shrink-0 text-sidebar-foreground" />
        <span className="truncate">{os}</span>
      </div>

      <div className="flex items-center gap-1.5 min-w-0">
        {device.icon}
        <span className="truncate">{deviceName}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <HardDriveIcon size={16} className="shrink-0 text-sky-500" />
        <span>RAM: {availableMemory}</span>
      </div>
    </div>
  )
}
