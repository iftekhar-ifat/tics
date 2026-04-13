import { Link } from '@tanstack/react-router'
import {
  FolderIcon,
  FolderOpenIcon,
  GearIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SpinnerIcon
} from '@phosphor-icons/react'
import { type ReactNode } from 'react'
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from '@/components/ui/sidebar'
import {
  TreeProvider,
  TreeView,
  TreeNode,
  TreeNodeTrigger,
  TreeNodeContent,
  TreeIcon,
  TreeLabel,
  TreeExpander
} from '@/components/ui/tree'
import { cn } from '@/lib/utils'

export type FolderStatus = 'idle' | 'indexed' | 'indexing' | 'new'

export interface FolderData {
  id: string
  name: string
  imageCount: number
  status: FolderStatus
  children?: FolderData[]
}

export interface HardwareInfo {
  device: 'cpu' | 'cuda' | 'mps'
  throughput: number | null
  totalIndexed: number
}

interface AppSidebarProps {
  folders?: FolderData[]
  hardwareInfo?: HardwareInfo
  className?: string
}

function FolderStatusBadge({ status }: { status: FolderStatus }) {
  switch (status) {
    case 'indexing':
      return (
        <div className="flex items-center justify-center rounded-full bg-primary/10 px-1 py-0.5">
          <SpinnerIcon className="h-2.5 w-2.5 animate-spin text-primary" />
        </div>
      )
    case 'new':
      return (
        <div className="flex items-center justify-center rounded-full bg-primary/10 px-1 py-0.5">
          <PlusIcon className="h-2.5 w-2.5 text-primary" />
        </div>
      )
    case 'indexed':
      return <div className="h-2 w-2 rounded-full bg-sidebar-accent" />
    case 'idle':
    default:
      return <div className="h-2 w-2 rounded-full bg-sidebar-border" />
  }
}

function FolderTreeNode({
  folder,
  level = 0,
  isLast = false
}: {
  folder: FolderData
  level?: number
  isLast?: boolean
}) {
  const hasChildren = folder.children && folder.children.length > 0

  return (
    <TreeNode nodeId={folder.id} level={level} isLast={isLast}>
      <TreeNodeTrigger>
        <TreeExpander hasChildren={hasChildren} />
        <TreeIcon hasChildren={hasChildren}>
          {hasChildren ? (
            <FolderOpenIcon className="h-4 w-4" />
          ) : (
            <FolderIcon className="h-4 w-4" />
          )}
        </TreeIcon>
        <TreeLabel>{folder.name}</TreeLabel>
        <SidebarMenuBadge>{folder.imageCount}</SidebarMenuBadge>
        <div className="ml-auto mr-1">
          <FolderStatusBadge status={folder.status} />
        </div>
      </TreeNodeTrigger>
      <TreeNodeContent hasChildren={hasChildren}>
        {folder.children?.map((child, index) => (
          <FolderTreeNode
            key={child.id}
            folder={child}
            level={level + 1}
            isLast={index === (folder.children?.length ?? 0) - 1}
          />
        ))}
      </TreeNodeContent>
    </TreeNode>
  )
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

export function AppSidebar({
  folders = [],
  hardwareInfo,
  className
}: AppSidebarProps): React.JSX.Element {
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
          <SidebarGroupLabel className="h-8 px-2 text-xs">Folders</SidebarGroupLabel>
          <SidebarGroupContent className="overflow-auto">
            <TreeProvider showLines showIcons selectable={false} defaultExpandedIds={[]}>
              <TreeView>
                {folders.map((folder, index) => (
                  <FolderTreeNode
                    key={folder.id}
                    folder={folder}
                    isLast={index === folders.length - 1}
                  />
                ))}
              </TreeView>
            </TreeProvider>
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
