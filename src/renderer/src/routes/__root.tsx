import { Outlet, createRootRoute } from '@tanstack/react-router'
import { UpdateBanner } from '@/components/updater/update-banner'
import { useAppStore } from '@/stores/app-store'
import { Onboarding } from '@/components/onboarding/onboarding'

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout(): React.JSX.Element {
  const { onboardingComplete, setOnboardingComplete } = useAppStore()

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true)
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="text-sm font-semibold">Tics</span>
          <a className="text-sm text-muted-foreground" href="/">
            Home
          </a>
          <a className="text-sm text-muted-foreground" href="/settings">
            Settings
          </a>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      <UpdateBanner />
      {!onboardingComplete && <Onboarding onComplete={handleOnboardingComplete} />}
    </div>
  )
}
