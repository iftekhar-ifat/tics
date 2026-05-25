import { UploadIcon, FolderIcon, SpinnerIcon } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { GalleryUpload } from '@/components/ui/gallery-upload'
import { useAppStore } from '@/stores/app-store'
import { useState, useCallback } from 'react'
import type { FileWithPreview } from '@/hooks/use-file-upload'

export default function UploadToRoot() {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [moving, setMoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootFolder = useAppStore((s) => s.rootFolder)

  const handleMoveToRoot = useCallback(async () => {
    if (!rootFolder) return
    setMoving(true)
    setError(null)

    for (const fw of files) {
      if (!(fw.file instanceof File)) continue
      try {
        const buffer = await fw.file.arrayBuffer()
        const result = await window.api.file.copyToRoot(rootFolder.path, fw.file.name, buffer)
        if (!result.ok) {
          throw new Error(result.message ?? 'Failed to copy file')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setMoving(false)
        return
      }
    }

    setMoving(false)
    setFiles([])
    setIsOpen(false)
  }, [files, rootFolder])

  return (
    <>
      <Button
        onClick={() => {
          setFiles([])
          setError(null)
          setIsOpen(true)
        }}
      >
        <UploadIcon size={12} />
        Upload to Root
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="min-w-xl">
          <DialogHeader>
            <DialogTitle>Upload to Root</DialogTitle>
            <DialogDescription>
              {rootFolder ? `Upload images to ${rootFolder.name}` : 'Select a root folder first'}
            </DialogDescription>
          </DialogHeader>
          <GalleryUpload accept="image/*" multiple onFilesChange={(f) => setFiles(f)} />
          {error && <p className="text-destructive text-sm pt-2">{error}</p>}
          {files.length > 0 && rootFolder && (
            <div className="flex justify-end pt-4">
              <Button onClick={handleMoveToRoot} disabled={moving}>
                {moving ? (
                  <SpinnerIcon size={12} className="animate-spin" />
                ) : (
                  <FolderIcon size={12} />
                )}
                {moving ? 'Moving...' : 'Move to Root'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
