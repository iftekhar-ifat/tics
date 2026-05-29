import { useBackendReady } from '@/hooks/use-backend-ready'
import LoadingLogo from './ui/loading-logo'

export function SplashScreen(): React.JSX.Element {
  const { error } = useBackendReady()

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div>
        {!error && <LoadingLogo text="Connecting..." />}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
