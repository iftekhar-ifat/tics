import { UploadIcon, FolderIcon } from '@phosphor-icons/react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { GalleryUpload } from '@/components/ui/gallery-upload'
import { useState } from 'react'

export default function UploadToRoot() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasFiles, setHasFiles] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <UploadIcon size={12} />
        Upload to Root
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="min-w-xl">
          <DialogHeader>
            <DialogTitle>Upload to Root</DialogTitle>
            <DialogDescription>Select images to upload to the root folder</DialogDescription>
          </DialogHeader>
          <GalleryUpload
            accept="image/*"
            multiple
            onFilesChange={(files) => setHasFiles(files.length > 0)}
          />
          {hasFiles && (
            <div className="flex justify-end pt-4">
              <Button onClick={() => {}}>
                <FolderIcon size={12} />
                Move to Root
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
