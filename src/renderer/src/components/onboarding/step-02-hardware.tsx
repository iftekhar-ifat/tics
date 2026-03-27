import { useEffect, useState } from 'react'
import { useOnboardingStore, type HardwareInfo } from '@/stores/onboarding-store'
import { Check, Spinner } from '@phosphor-icons/react'

interface CheckItem {
  label: string
  value: string | null
  checked: boolean
}

export function Step02Hardware(): React.JSX.Element {
  const { setHardwareInfo, setHardwareCheckComplete, hardwareCheckComplete } = useOnboardingStore()
  const [checks, setChecks] = useState<CheckItem[]>([
    { label: 'Operating System', value: null, checked: false },
    { label: 'Inference Device', value: null, checked: false },
    { label: 'Available Memory', value: null, checked: false }
  ])

  useEffect(() => {
    if (hardwareCheckComplete) return

    const runChecks = async () => {
      const osInfo = (await window.api.system.getOSInfo?.()) ?? {
        os: 'Windows 11',
        device: 'cuda',
        deviceName: 'NVIDIA RTX 3080',
        memory: '32 GB'
      }

      const newChecks: CheckItem[] = [
        { label: 'Operating System', value: osInfo.os, checked: false },
        {
          label: 'Inference Device',
          value:
            osInfo.device === 'cuda'
              ? `CUDA · ${osInfo.deviceName}`
              : osInfo.device === 'mps'
                ? 'Apple MPS'
                : `CPU · ${osInfo.deviceName}`,
          checked: false
        },
        { label: 'Available Memory', value: osInfo.memory, checked: false }
      ]

      for (let i = 0; i < newChecks.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        newChecks[i].checked = true
        setChecks([...newChecks])
      }

      const hwInfo: HardwareInfo = {
        os: osInfo.os,
        inferenceDevice: osInfo.device as 'mps' | 'cuda' | 'cpu',
        deviceName: osInfo.deviceName,
        availableMemory: osInfo.memory
      }
      setHardwareInfo(hwInfo)
      setHardwareCheckComplete(true)
    }

    void runChecks()
  }, [hardwareCheckComplete, setHardwareCheckComplete, setHardwareInfo])

  const getDeviceMessage = (): string => {
    const deviceCheck = checks[1]
    if (!deviceCheck.value) return ''

    if (deviceCheck.value.includes('CUDA') || deviceCheck.value.includes('MPS')) {
      return 'Your hardware is well-suited for fast local inference. Indexing 1,000 images typically takes under a minute.'
    }
    return 'No GPU detected — Tics will run fully on CPU. Indexing will be slower, roughly 3–5 minutes per 1,000 images. You can always index in the background.'
  }

  const allChecked = checks.every((c) => c.checked)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-3">
            <div className="flex size-5 items-center justify-center rounded-sm border border-border">
              {check.checked ? (
                <Check className="size-3 text-primary" weight="bold" />
              ) : (
                <Spinner className="size-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <span className="text-sm">{check.label}</span>
              {check.checked && check.value && (
                <span className="ml-2 font-mono text-xs text-muted-foreground">{check.value}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {allChecked && (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{getDeviceMessage()}</p>
        </div>
      )}
    </div>
  )
}
