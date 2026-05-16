import { useBackendReady } from '@/hooks/use-backend-ready'

export function SplashScreen(): React.JSX.Element {
  const { error } = useBackendReady()

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="text-center">
        {!error && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
            <p className="text-sm text-muted-foreground">Connecting to backend...</p>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
