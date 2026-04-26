import { Outlet, createRootRoute } from '@tanstack/react-router'
import { UpdateBanner } from '@/components/updater/update-banner'
import { useAppStore } from '@/stores/app-store'
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
  const { appReady, onboardingComplete } = useAppStore()

  if (!appReady) {
    return <SplashScreen />
  }

  return (
    <BackendEventsProvider>
      <SidebarProvider defaultOpen>
        <div className="flex h-screen w-full overflow-hidden">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize="20%" minSize="20%" maxSize="35%">
              <Sidebar className="w-full overflow-hidden" collapsible="none">
                <AppSidebar />
              </Sidebar>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel>
              <SidebarInset>
                <Outlet />
              </SidebarInset>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        <UpdateBanner />
        {!onboardingComplete && <Onboarding />}
      </SidebarProvider>
    </BackendEventsProvider>
  )
}
