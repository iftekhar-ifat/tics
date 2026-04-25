import { useState, useEffect, useCallback } from 'react'
import { FolderIcon, FolderOpenIcon, ImageIcon, SpinnerIcon } from '@phosphor-icons/react'
import {
  TreeProvider,
  TreeView,
  TreeNode,
  TreeNodeTrigger,
  TreeNodeContent,
  TreeIcon,
  TreeLabel,
  TreeExpander,
  useTree
} from '@/components/ui/tree'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ScrollBar } from '@/components/ui/scroll-area'
import { useAppStore } from '@/stores/app-store'

interface TreeNodeData {
  id: string
  name: string
  type: 'folder' | 'file'
  path: string
  children: TreeNodeData[]
  loaded: boolean
  hasChildren: boolean
}

interface FileTreeNodeProps {
  node: TreeNodeData
  level?: number
  isLast?: boolean
  onLoadChildren: (node: TreeNodeData) => Promise<void>
}

function createFolderNode(
  name: string,
  path: string,
  parentPath: string,
  hasChildren: boolean
): TreeNodeData {
  const id = parentPath ? `${parentPath}/${name}` : name
  return {
    id,
    name,
    type: 'folder',
    path,
    children: [],
    loaded: false,
    hasChildren
  }
}

function createFileNode(name: string, path: string, parentPath: string): TreeNodeData {
  const id = parentPath ? `${parentPath}/${name}` : name
  return {
    id,
    name,
    type: 'file',
    path,
    children: [],
    loaded: true,
    hasChildren: false
  }
}

function updateNodeInTree(
  root: TreeNodeData,
  targetId: string,
  newChildren: TreeNodeData[]
): TreeNodeData {
  if (root.id === targetId) {
    return {
      ...root,
      children: newChildren,
      loaded: true,
      hasChildren: newChildren.length > 0
    }
  }
  return {
    ...root,
    children: root.children.map((child) =>
      child.type === 'folder' ? updateNodeInTree(child, targetId, newChildren) : child
    )
  }
}

function FileTreeNode({
  node,
  level = 0,
  isLast = false,
  onLoadChildren
}: FileTreeNodeProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false)
  const { expandedIds } = useTree()
  const isExpanded = expandedIds.has(node.id)

  const handleExpand = async () => {
    if (!node.loaded && node.hasChildren) {
      setIsLoading(true)
      try {
        await onLoadChildren(node)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const hasChildren = node.hasChildren || (node.children && node.children.length > 0)

  return (
    <TreeNode nodeId={node.id} level={level} isLast={isLast}>
      <TreeNodeTrigger onClick={handleExpand}>
        {isLoading ? (
          <div className="mr-1 flex h-4 w-4 items-center justify-center">
            <SpinnerIcon className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <TreeExpander hasChildren={hasChildren} />
        )}
        <TreeIcon
          hasChildren={hasChildren}
          icon={
            node.type === 'folder' ? (
              hasChildren ? (
                isExpanded ? (
                  <FolderOpenIcon className="h-4 w-4" />
                ) : (
                  <FolderIcon className="h-4 w-4" />
                )
              ) : (
                <FolderIcon className="h-4 w-4" />
              )
            ) : (
              <ImageIcon className="h-4 w-4" />
            )
          }
        ></TreeIcon>
        <TreeLabel className="text-muted-foreground">{node.name}</TreeLabel>
      </TreeNodeTrigger>
      <TreeNodeContent hasChildren={hasChildren}>
        {node.children.map((child, index) => (
          <FileTreeNode
            key={child.id}
            node={child}
            level={level + 1}
            isLast={index === node.children.length - 1}
            onLoadChildren={onLoadChildren}
          />
        ))}
      </TreeNodeContent>
    </TreeNode>
  )
}

export function FolderTree(): React.JSX.Element {
  const { rootFolder } = useAppStore()
  const [rootNode, setRootNode] = useState<TreeNodeData | null>(null)

  // Initialize root node when rootFolder changes - deriving state from store is safe
  useEffect(() => {
    if (rootFolder) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRootNode({
        id: 'root',
        name: rootFolder.name,
        type: 'folder',
        path: rootFolder.path,
        children: [],
        loaded: false,
        hasChildren: true
      })
    } else {
      setRootNode(null)
    }
  }, [rootFolder])

  const loadChildren = useCallback(
    async (node: TreeNodeData) => {
      if (node.loaded) return

      try {
        const subdirs = await window.api.folder.listSubdirectories(node.path)
        const images = await window.api.folder.getAllImages(node.path)

        const childNodes: TreeNodeData[] = []

        for (const dir of subdirs) {
          childNodes.push(
            createFolderNode(dir.name, dir.path, node.path === 'root' ? '' : node.path, true)
          )
        }

        for (const img of images) {
          const isDirectChild = !img.relativePath.includes('/') && !img.relativePath.includes('\\')
          if (isDirectChild || node.path === rootFolder?.path) {
            if (node.path === rootFolder?.path) {
              const parts = img.relativePath.split(/[/\\]/)
              if (parts.length === 1) {
                childNodes.push(createFileNode(img.name, img.path, node.path))
              }
            } else {
              childNodes.push(createFileNode(img.name, img.path, node.path))
            }
          }
        }

        setRootNode((prev) => {
          if (!prev) return prev
          return updateNodeInTree(prev, node.id, childNodes)
        })
      } catch (error) {
        console.error('Failed to load children:', error)
      }
    },
    [rootFolder]
  )

  // Load root children on mount when root is auto-expanded
  useEffect(() => {
    if (rootNode && rootNode.id === 'root' && !rootNode.loaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadChildren(rootNode)
    }
  }, [rootNode, loadChildren])

  if (!rootNode) {
    return <></>
  }

  return (
    // [&>div>div]:!block is required for file name truncate
    <ScrollArea className="h-full min-h-0 [&>div>div]:block!">
      <TreeProvider showLines showIcons selectable={false} defaultExpandedIds={['root']}>
        <TreeView className="p-1">
          <FileTreeNode node={rootNode} level={0} isLast={true} onLoadChildren={loadChildren} />
        </TreeView>
      </TreeProvider>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}
