import { Link, useLocation } from '@tanstack/react-router'
import { GearSixIcon, HouseIcon, SwapIcon } from '@phosphor-icons/react'
import { type ReactNode } from 'react'
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'
import { FolderTree } from './sidebar-components/folder-tree'
import { Button } from './ui/button'
import TicsLogo from '@/assets/logo-sidebar.svg'
import { HardwareInfoPanel } from './sidebar-components/hardware-info-panel'
import { IndexingStatusPanel } from './sidebar-components/indexing-status-panel'

interface AppSidebarProps {
  className?: string
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  const location = useLocation()
  const isActive = location.pathname === to

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={to}>
          {icon}
          <span className="text-sm">{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function AppSidebar({ className }: AppSidebarProps): React.JSX.Element {
  const setRootFolder = useAppStore((s) => s.setRootFolder)

  const handleChangeRootFolder = async () => {
    const result = await window.api.dialog.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      const name = path.split(/[/\\]/).pop() || path
      const scanResult = await window.api.folder.scanFolder(path)
      setRootFolder({
        path,
        name,
        imageCount: scanResult.imageCount,
        totalSize: scanResult.totalSize
      })
    }
  }

  return (
    <div className={cn('flex h-full flex-col bg-sidebar', className)}>
      <SidebarHeader className="h-24">
        <div className="flex h-full flex-col items-center justify-center gap-1 px-2">
          <div className="flex items-center justify-center gap-2">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src={TicsLogo} alt="Tics Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-mono text-xl font-bold tracking-widest">TICS</span>
          </div>

          <span className="font-mono text-[10px] text-muted-foreground tracking-wide">
            Text-Image-Context-Search
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="my-2" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem to="/" icon={<HouseIcon />} label="Home" />
              <NavItem to="/settings" icon={<GearSixIcon />} label="Settings" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <IndexingStatusPanel />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup className="flex-1 overflow-hidden">
          <SidebarGroupLabel className="h-8">
            <div className="flex w-full items-center justify-between">
              <span className="text-primary text-sm">Folders</span>
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={handleChangeRootFolder}
              >
                <SwapIcon /> Change
              </Button>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex-1 min-h-0">
            <FolderTree />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter>
        <HardwareInfoPanel />
      </SidebarFooter>
    </div>
  )
}
