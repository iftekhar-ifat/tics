'use client'

import { useState } from 'react'
import { FolderIcon, PlusIcon } from '@phosphor-icons/react'
import { useAppStore } from '@/stores/app-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface FolderRowProps {
  path: string
  imageCount: number
  onReindex: () => void
  onClearIndex: () => void
  onRemove: () => void
}

function FolderRow({
  path,
  imageCount,
  onReindex,
  onClearIndex,
  onRemove
}: FolderRowProps): React.JSX.Element {
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  return (
    <>
      <div className="flex items-center gap-3 py-3 px-1">
        <FolderIcon className="size-5 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-xs text-muted-foreground">{path}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{imageCount} images</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="xs"
            onClick={onReindex}
            className="h-7 rounded-none border border-border bg-background px-2 text-xs"
          >
            Re-index
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowClearDialog(true)}
            className="h-7 rounded-none border border-border bg-background px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Clear Index
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowRemoveDialog(true)}
            className="h-7 rounded-none border border-border bg-background px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Remove
          </Button>
        </div>
      </div>
      <Separator className="my-1" />

      {/* Clear Index Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="rounded-none border bg-card p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-sm">Clear Index</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to clear the index for this folder? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1 px-4 pb-4 pt-0">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowClearDialog(false)}
              className="h-7 rounded-none border px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={() => {
                onClearIndex()
                setShowClearDialog(false)
              }}
              className="h-7 rounded-none px-3 text-xs"
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Folder Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent className="rounded-none border bg-card p-0">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="text-sm">Remove Folder</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove this folder? Its index will also be cleared. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1 px-4 pb-4 pt-0">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowRemoveDialog(false)}
              className="h-7 rounded-none border px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={() => {
                onRemove()
                setShowRemoveDialog(false)
              }}
              className="h-7 rounded-none px-3 text-xs"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function FoldersSection(): React.JSX.Element {
  const { rootFolder, setRootFolder } = useAppStore()
  const [folders, setFolders] = useState<Array<{ path: string; imageCount: number }>>([])

  const handleAddFolder = async () => {
    const result = await window.api.dialog.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      // Check if folder already exists
      if (folders.some((f) => f.path === path) || rootFolder?.path === path) {
        return
      }
      const scanResult = await window.api.folder.scanFolder(path)
      const newFolder = { path, imageCount: scanResult.imageCount }
      setFolders((prev) => [...prev, newFolder])
    }
  }

  const handleReindex = async (path: string) => {
    const scanResult = await window.api.folder.scanFolder(path)
    if (path === rootFolder?.path) {
      setRootFolder({
        ...rootFolder,
        imageCount: scanResult.imageCount,
        totalSize: scanResult.totalSize
      })
    } else {
      setFolders((prev) =>
        prev.map((f) => (f.path === path ? { ...f, imageCount: scanResult.imageCount } : f))
      )
    }
  }

  const handleClearIndex = (path: string) => {
    // In a real implementation, this would call an IPC to clear the FAISS index
    // For now, we just update the folder list
    console.log(`Clear index for: ${path}`)
  }

  const handleRemoveFolder = (path: string) => {
    if (path === rootFolder?.path) {
      setRootFolder(null)
    } else {
      setFolders((prev) => prev.filter((f) => f.path !== path))
    }
  }

  const allFolders = [
    ...(rootFolder ? [{ path: rootFolder.path, imageCount: rootFolder.imageCount }] : []),
    ...folders
  ]

  return (
    <Card className="rounded-none border-b-0 border-x-0 bg-card shadow-none">
      <CardHeader className="flex flex-row items-center justify-between gap-4 px-4 py-3">
        <CardTitle className="text-sm">Folders</CardTitle>
        <Button
          variant="outline"
          size="xs"
          onClick={handleAddFolder}
          className="h-7 gap-1 rounded-none border px-2 text-xs"
        >
          <PlusIcon className="size-3" />
          Add Folder
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px]">
          <div className="px-1">
            {allFolders.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center">
                <span className="text-xs text-muted-foreground">No folders added</span>
              </div>
            ) : (
              allFolders.map((folder) => (
                <FolderRow
                  key={folder.path}
                  path={folder.path}
                  imageCount={folder.imageCount}
                  onReindex={() => handleReindex(folder.path)}
                  onClearIndex={() => handleClearIndex(folder.path)}
                  onRemove={() => handleRemoveFolder(folder.path)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
