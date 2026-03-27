import { useOnboardingStore } from '@/stores/onboarding-store'
import { Step01Library } from './step-01-library'
import { Step02Hardware } from './step-02-hardware'
import { Step03Model } from './step-03-model'
import { Step04Index } from './step-04-index'
import { Button } from '@/components/ui/button'

interface OnboardingProps {
  onComplete: () => void
}

export function Onboarding({ onComplete }: OnboardingProps): React.JSX.Element {
  const { currentStep, nextStep, prevStep, folderInfo, hardwareCheckComplete, modelStatus } =
    useOnboardingStore()

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return folderInfo !== null
      case 2:
        return hardwareCheckComplete
      case 3:
        return modelStatus === 'complete'
      case 4:
        return false
      default:
        return false
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step01Library />
      case 2:
        return <Step02Hardware />
      case 3:
        return <Step03Model />
      case 4:
        return <Step04Index onComplete={onComplete} />
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <div />
          <span className="font-mono text-xs text-muted-foreground">
            {String(currentStep).padStart(2, '0')} / 04
          </span>
        </div>

        <div className="min-h-[200px]">{renderStep()}</div>

        {currentStep !== 4 && (
          <div className="mt-6 flex justify-end gap-2">
            {currentStep > 1 && (
              <Button variant="ghost" onClick={prevStep}>
                Back
              </Button>
            )}
            <Button disabled={!canProceed()} onClick={nextStep}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
