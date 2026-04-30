import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useAppStore } from '@/stores'
import { formatBytes } from '@/utils/helper'
import { TrashIcon } from '@phosphor-icons/react'
import { useState } from 'react'

export function ModelDeleteSection({
  onDelete
}: {
  onDelete: () => Promise<void>
}): React.JSX.Element {
  const modelFolder = useAppStore((s) => s.modelFolder)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDeleteModel = async () => {
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await onDelete()
      setDeleteOpen(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete model')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      <Button
        variant="destructive"
        size="sm"
        className="h-7 gap-1 rounded-none text-xs"
        onClick={() => setDeleteOpen(true)}
        disabled={!modelFolder}
      >
        <TrashIcon size={14} />
        Delete
      </Button>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <TrashIcon size={20} />
              Delete Model
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the model? This will permanently remove the model
              files. You will need to re-download it if you want to use it again.
            </DialogDescription>
          </DialogHeader>
          {modelFolder && (
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Current location:</p>
              <p className="mt-1 text-xs font-mono text-sidebar-foreground break-all">
                {modelFolder.path}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">Current size:</p>
              <p className="font-mono text-sm text-sidebar-foreground">
                {formatBytes(modelFolder.size)}
              </p>
            </div>
          )}
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteModel}
              disabled={deleteLoading}
              className="min-w-[80px]"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
