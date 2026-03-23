import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { UpdateBanner } from '@/components/updater/update-banner'

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout(): React.JSX.Element {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="text-sm font-semibold">Tics</span>
          <Link
            activeProps={{ className: 'text-foreground' }}
            className="text-sm text-muted-foreground"
            search={{}}
            to="/"
          >
            Home
          </Link>
          <Link
            activeProps={{ className: 'text-foreground' }}
            className="text-sm text-muted-foreground"
            search={{}}
            to="/settings"
          >
            Settings
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      <UpdateBanner />
    </div>
  )
}
