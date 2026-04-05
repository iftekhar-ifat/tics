import { Outlet, createRootRoute, Link } from '@tanstack/react-router'
import { UpdateBanner } from '@/components/updater/update-banner'
import { useAppStore } from '@/stores/app-store'
import { Onboarding } from '@/components/onboarding/onboarding'
import { SplashScreen } from '@/components/splash-screen'
import { BackendEventsProvider } from '@/hooks/use-backend-events'

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout(): React.JSX.Element {
  const { onboardingComplete, setOnboardingComplete, appReady } = useAppStore()

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true)
  }

  if (!appReady) {
    return <SplashScreen />
  }

  return (
    <BackendEventsProvider>
      <div className="min-h-screen">
        <header className="border-b border-border">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <span className="text-sm font-semibold">Tics</span>
            <Link to="/" className="text-sm text-muted-foreground">
              Home
            </Link>
            <Link to="/settings" className="text-sm text-muted-foreground">
              Settings
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </main>
        <UpdateBanner />
        {!onboardingComplete && <Onboarding onComplete={handleOnboardingComplete} />}
      </div>
    </BackendEventsProvider>
  )
}
