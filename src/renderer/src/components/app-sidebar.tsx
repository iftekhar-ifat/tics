import { Link } from '@tanstack/react-router'
import { GearIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
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

export interface HardwareInfo {
  device: 'cpu' | 'cuda' | 'mps'
  throughput: number | null
  totalIndexed: number
}

interface AppSidebarProps {
  hardwareInfo?: HardwareInfo
  className?: string
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <Link to={to}>
          {icon}
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function HardwareStatusChip({ hardwareInfo }: { hardwareInfo?: HardwareInfo }) {
  const deviceLabel = hardwareInfo?.device.toUpperCase() ?? '—'
  const throughput = hardwareInfo?.throughput ?? '—'
  const totalIndexed = hardwareInfo?.totalIndexed?.toLocaleString() ?? '0'

  return (
    <div className="flex w-full items-center gap-2 text-xs text-sidebar-foreground">
      <div className="flex items-center gap-1 rounded-none bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium">
        {deviceLabel}
      </div>
      <span className="text-sidebar-foreground/70">{throughput} img/s</span>
      <span className="text-sidebar-foreground/50">|</span>
      <span className="text-sidebar-foreground/70">{totalIndexed} indexed</span>
    </div>
  )
}

export function AppSidebar({ hardwareInfo, className }: AppSidebarProps): React.JSX.Element {
  const { setRootFolder } = useAppStore()

  const handleChangeRootFolder = async () => {
    const result = await window.api.dialog.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      const name = path.split(/[/\\]/).pop() || path
      const scanResult = await window.api.folder.scanFolder(path)
      setRootFolder({
        path,
        name,
        imageCount: scanResult.imageCount
      })
    }
  }

  return (
    <div className={cn('flex h-full flex-col bg-sidebar', className)}>
      <SidebarHeader className="h-12">
        <div className="flex items-center px-2">
          <span className="text-sm font-semibold text-sidebar-foreground">Tics</span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="h-8 px-2 text-xs">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <NavItem to="/" icon={<MagnifyingGlassIcon className="h-4 w-4" />} label="Search" />
              <NavItem to="/settings" icon={<GearIcon className="h-4 w-4" />} label="Settings" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-2" />

        <SidebarGroup className="flex-1 overflow-hidden">
          <SidebarGroupLabel className="h-8 px-2 text-xs">
            <div className="flex w-full items-center justify-between">
              <span>Folders</span>
              <button
                className="text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground"
                onClick={handleChangeRootFolder}
              >
                Change
              </button>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex-1 min-h-0">
            <FolderTree />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="h-10">
        <HardwareStatusChip hardwareInfo={hardwareInfo} />
      </SidebarFooter>
    </div>
  )
}
