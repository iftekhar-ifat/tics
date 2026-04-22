import { Outlet, createRootRoute } from '@tanstack/react-router'
import { UpdateBanner } from '@/components/updater/update-banner'
import { useAppStore } from '@/stores/app-store'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { Onboarding } from '@/components/onboarding/onboarding'
import { SplashScreen } from '@/components/splash-screen'
import { BackendEventsProvider } from '@/hooks/use-backend-events'
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

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
        <div className="flex h-screen overflow-hidden">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize="25%" minSize="15%" maxSize="35%">
              <Sidebar className="w-full overflow-hidden" collapsible="none">
                <AppSidebar />
              </Sidebar>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel>
              <SidebarInset>
                <div className="mx-auto px-4 py-6">
                  <Outlet />
                </div>
              </SidebarInset>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <UpdateBanner />
        {!onboardingComplete && <Onboarding onComplete={handleOnboardingComplete} />}
      </SidebarProvider>
    </BackendEventsProvider>
  )
}
