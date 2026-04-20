import { Outlet, createRootRoute } from '@tanstack/react-router'
import { UpdateBanner } from '@/components/updater/update-banner'
import { useAppStore } from '@/stores/app-store'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Onboarding } from '@/components/onboarding/onboarding'
import { SplashScreen } from '@/components/splash-screen'
import { BackendEventsProvider } from '@/hooks/use-backend-events'
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout(): React.JSX.Element {
  const { onboardingComplete, setOnboardingComplete, setRootFolder, appReady } = useAppStore()
  const { folderInfo } = useOnboardingStore()

  const handleOnboardingComplete = () => {
    if (folderInfo) {
      setRootFolder({
        path: folderInfo.path,
        name: folderInfo.name,
        imageCount: folderInfo.imageCount
      })
    }
    setOnboardingComplete(true)
  }

  if (!appReady) {
    return <SplashScreen />
  }

  return (
    <BackendEventsProvider>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen">
          <Sidebar collapsible="none">
            <AppSidebar />
          </Sidebar>
          <SidebarInset>
            <div className="mx-auto max-w-5xl px-4 py-6">
              <Outlet />
            </div>
          </SidebarInset>
        </div>
        <UpdateBanner />
        {!onboardingComplete && <Onboarding onComplete={handleOnboardingComplete} />}
      </SidebarProvider>
    </BackendEventsProvider>
  )
}
