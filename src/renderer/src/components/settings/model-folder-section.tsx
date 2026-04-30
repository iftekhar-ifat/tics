import { useState } from 'react'
import { FolderIcon, LinkSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/stores'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'

interface ModelFolderSectionProps {
  onMoveFolder: (newDir: string) => Promise<{ path: string; size: number }>
}

export function ModelFolderSection({ onMoveFolder }: ModelFolderSectionProps): React.JSX.Element {
  const modelFolder = useAppStore((s) => s.modelFolder)
  const [folderInfoOpen, setFolderInfoOpen] = useState(false)
  const [moveFolderOpen, setMoveFolderOpen] = useState(false)
  const [targetDir, setTargetDir] = useState('')
  const [moveLoading, setMoveLoading] = useState(false)
  const [moveError, setMoveError] = useState('')

  const handleSelectTargetDir = async () => {
    const result = await window.api.dialog.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      setTargetDir(result.filePaths[0])
      setMoveError('')
    }
  }

  const handleMoveFolder = async () => {
    if (!targetDir) return
    setMoveLoading(true)
    setMoveError('')
    try {
      // Move the folder and get the new location/size
      const result = await onMoveFolder(targetDir)
      if (result) {
        useAppStore.getState().setModelFolder({
          path: result.path,
          size: result.size
        })
      }
      setMoveFolderOpen(false)
      setTargetDir('')
    } catch (err) {
      setMoveError(err instanceof Error ? err.message : 'Failed to move folder')
    } finally {
      setMoveLoading(false)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    const value = bytes / Math.pow(1024, i)
    return `${value.toFixed(2)} ${units[i]}`
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FolderIcon className="text-sidebar-foreground" size={16} />
          <span className="text-sm font-medium">Model Folder</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 rounded-none text-xs"
          onClick={() => setFolderInfoOpen(true)}
        >
          <LinkSimpleIcon size={14} />
          Details & Move
        </Button>
      </div>

      {modelFolder ? (
        <div className="mt-2 flex flex-col gap-1.5 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Location:</span>
            <span className="max-w-[200px] truncate font-mono text-xs text-sidebar-foreground">
              {modelFolder.path}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Total Size:</span>
            <span className="font-mono text-sm text-sidebar-foreground">
              {formatBytes(modelFolder.size)}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground/60">No model folder info available</p>
      )}

      {/* Folder Info Dialog */}
      <Dialog
        open={folderInfoOpen}
        onOpenChange={(open) => {
          setFolderInfoOpen(open)
          if (!open) {
            setMoveFolderOpen(false)
            setTargetDir('')
            setMoveError('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderIcon size={20} />
              Model Folder Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {modelFolder ? (
              <>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <div className="rounded-md border bg-muted/50 p-2 text-xs font-mono break-all">
                    {modelFolder.path}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Total Size</Label>
                  <div className="rounded-md border bg-muted/50 p-2 text-sm font-mono">
                    {formatBytes(modelFolder.size)}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setFolderInfoOpen(false)
                    setMoveFolderOpen(true)
                  }}
                >
                  <FolderIcon className="mr-2 size-4" />
                  Move Folder to Another Location
                </Button>
              </>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                No model folder info available
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Folder Dialog */}
      <Dialog
        open={moveFolderOpen}
        onOpenChange={(open) => {
          setMoveFolderOpen(open)
          if (!open) {
            setTargetDir('')
            setMoveError('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderIcon size={20} />
              Move Model Folder
            </DialogTitle>
            <DialogDescription>
              Select a new location for the model folder. The entire folder will be copied to the
              new location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Directory</Label>
              <div className="flex gap-2">
                <Input
                  value={targetDir}
                  onChange={(e) => {
                    setTargetDir(e.target.value)
                    setMoveError('')
                  }}
                  placeholder="/path/to/new/location"
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectTargetDir}
                  className="whitespace-nowrap"
                >
                  Browse
                </Button>
              </div>
            </div>
            {moveError && <p className="text-sm text-destructive">{moveError}</p>}
            {modelFolder && (
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Current location:</p>
                <p className="mt-1 text-xs font-mono text-sidebar-foreground">{modelFolder.path}</p>
                <p className="mt-2 text-xs text-muted-foreground">Current size:</p>
                <p className="font-mono text-sm text-sidebar-foreground">
                  {formatBytes(modelFolder.size)}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setMoveFolderOpen(false)
                  setTargetDir('')
                  setMoveError('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleMoveFolder}
                disabled={!targetDir || moveLoading}
                className="min-w-[80px]"
              >
                {moveLoading ? 'Moving...' : 'Move'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
