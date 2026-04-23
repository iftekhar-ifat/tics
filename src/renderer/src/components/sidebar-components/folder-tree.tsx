import { useState, useEffect, useMemo } from 'react'
import { FolderIcon, FolderOpenIcon, ImageIcon, SpinnerIcon } from '@phosphor-icons/react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { ScrollBar } from '@/components/ui/scroll-area'
import { useAppStore } from '@/stores/app-store'

interface ImageFile {
  name: string
  path: string
  relativePath: string
}

interface TreeNodeData {
  id: string
  name: string
  type: 'folder' | 'file'
  path: string
  children: TreeNodeData[]
}

function buildFileTree(rootFolderName: string, images: ImageFile[]): TreeNodeData[] {
  const root: TreeNodeData[] = []

  const rootNode: TreeNodeData = {
    id: 'root',
    name: rootFolderName,
    type: 'folder',
    path: 'root',
    children: []
  }
  root.push(rootNode)

  for (const image of images) {
    const parts = image.relativePath.split(/[/\\]/)
    let current = rootNode.children
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (i === parts.length - 1) {
        current.push({
          id: image.path,
          name: image.name,
          type: 'file',
          path: image.path,
          children: []
        })
      } else {
        let folder = current.find((n) => n.name === part && n.type === 'folder')
        if (!folder) {
          folder = {
            id: currentPath,
            name: part,
            type: 'folder',
            path: currentPath,
            children: []
          }
          current.push(folder)
        }
        current = folder.children
      }
    }
  }

  return root
}

interface FileTreeNodeProps {
  node: TreeNodeData
  level?: number
  isLast?: boolean
}

function FileTreeNode({ node, level = 0, isLast = false }: FileTreeNodeProps): React.JSX.Element {
  const hasChildren = node.children && node.children.length > 0

  return (
    <TreeNode nodeId={node.id} level={level} isLast={isLast}>
      <TreeNodeTrigger
        onClick={(e) => {
          if (node.type === 'file') {
            e.stopPropagation()
            window.api.file.openItem(node.path)
          }
        }}
      >
        <TreeExpander hasChildren={hasChildren} />
        <TreeIcon hasChildren={hasChildren}>
          {node.type === 'folder' ? (
            hasChildren ? (
              <FolderOpenIcon className="h-4 w-4" />
            ) : (
              <FolderIcon className="h-4 w-4" />
            )
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
        </TreeIcon>
        <TreeLabel className="text-muted-foreground">{node.name}</TreeLabel>
      </TreeNodeTrigger>
      <TreeNodeContent hasChildren={hasChildren}>
        {node.children.map((child, index) => (
          <FileTreeNode
            key={child.id}
            node={child}
            level={level + 1}
            isLast={index === node.children.length - 1}
          />
        ))}
      </TreeNodeContent>
    </TreeNode>
  )
}

export function FolderTree(): React.JSX.Element {
  const { rootFolder } = useAppStore()
  const [images, setImages] = useState<ImageFile[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (rootFolder) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true)
      // @ts-ignore - folder API will be available at runtime
      window.api.folder
        .getAllImages(rootFolder.path)
        .then(setImages)
        .finally(() => setLoading(false))
    } else {
      setImages([])
    }
  }, [rootFolder])

  const fileTree = useMemo(
    () => buildFileTree(rootFolder?.name || 'root', images),
    [images, rootFolder]
  )

  const defaultExpandedIds = useMemo(() => {
    const ids: string[] = []
    const addFolderIds = (nodes: TreeNodeData[]) => {
      for (const node of nodes) {
        if (node.type === 'folder' && node.children.length > 0) {
          ids.push(node.id)
          addFolderIds(node.children)
        }
      }
    }
    addFolderIds(fileTree)
    return ids
  }, [fileTree])

  const expandedIds = defaultExpandedIds.length > 0 ? defaultExpandedIds : ['root']

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <SpinnerIcon className="h-4 w-4 animate-spin text-sidebar-foreground/50" />
      </div>
    )
  }

  if (fileTree.length === 0) {
    return <></>
  }

  return (
    // [&>div>div]:!block is required for file name truncate
    <ScrollArea className="h-full min-h-0 [&>div>div]:!block">
      <TreeProvider showLines showIcons selectable={false} defaultExpandedIds={expandedIds}>
        <TreeView className="p-1 text-sm">
          {fileTree.map((node, index) => (
            <FileTreeNode
              key={node.id}
              node={node}
              level={0}
              isLast={index === fileTree.length - 1}
            />
          ))}
        </TreeView>
      </TreeProvider>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}
