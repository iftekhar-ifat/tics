import { useState } from 'react'
import { useFileUpload, type FileWithPreview } from '@/hooks/use-file-upload'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { WarningDiamondIcon, ImageIcon, UploadIcon } from '@phosphor-icons/react'
import { formatBytes } from '@/utils/helper'
import ImageCard from './image-card'

interface GalleryUploadProps {
  accept?: string
  multiple?: boolean
  className?: string
  onFilesChange?: (files: FileWithPreview[]) => void
}

export function GalleryUpload({
  accept = 'image/*',
  multiple = true,
  className,
  onFilesChange
}: GalleryUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  const [
    { files, isDragging, errors },
    {
      addFiles,
      removeFile,
      clearFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps
    }
  ] = useFileUpload({
    accept,
    multiple,
    onFilesChange
  })

  const allThumbnailsReady =
    files.length === 0 ||
    files.every((f) => {
      if (f.file instanceof File && f.file.type.startsWith('image/')) {
        return f.thumbnail !== undefined
      }
      return true
    })

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile()
        if (blob) {
          addFiles([blob])
          break
        }
      }
    }
  }

  return (
    <div className={cn('w-full', className)} onPaste={handlePaste}>
      {/* Upload Area */}
      <div
        className={cn(
          'relative border border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input {...getInputProps()} className="sr-only" />

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full',
              isDragging ? 'bg-primary/10' : 'bg-muted'
            )}
          >
            <ImageIcon
              className={cn('h-5 w-5', isDragging ? 'text-primary' : 'text-muted-foreground')}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Upload images to root</h3>
            <p className="text-muted-foreground text-sm">
              Drag &amp; drop, select, or paste images here
            </p>
          </div>

          <Button onClick={openFileDialog}>
            <UploadIcon className="h-4 w-4" />
            Select images
          </Button>
        </div>
      </div>

      {/* Gallery Stats */}
      {files.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">Gallery</h4>
            <div className="text-muted-foreground text-xs">
              Total: {formatBytes(files.reduce((acc, file) => acc + file.file.size, 0))}
            </div>
          </div>
          <Button onClick={clearFiles} variant="outline" size="sm">
            Clear all
          </Button>
        </div>
      )}

      {/* Image Grid */}
      {files.length > 0 && (
        <ScrollArea className="mt-4 *:data-radix-scroll-area-viewport:max-h-50">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {files.map((fileItem) => (
              <ImageCard
                key={fileItem.id}
                fileItem={fileItem}
                ready={allThumbnailsReady}
                onView={() => {
                  setSelectedImage(fileItem.preview!)
                  setIsPreviewLoading(true)
                }}
                onRemove={() => removeFile(fileItem.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mt-5">
          <WarningDiamondIcon />
          <AlertTitle>File upload error(s)</AlertTitle>
          <AlertDescription>
            {errors.map((error, index) => (
              <p key={index} className="last:mb-0">
                {error}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="**:data-[slot=dialog-close]:text-muted-foreground **:data-[slot=dialog-close]:hover:text-foreground **:data-[slot=dialog-close]:bg-background w-max border-none bg-transparent p-0 shadow-none sm:max-w-1/2 **:data-[slot=dialog-close]:-inset-e-7 **:data-[slot=dialog-close]:-top-7 **:data-[slot=dialog-close]:size-7"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center w-auto justify-center">
            {selectedImage && (
              <>
                {isPreviewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Spinner className="size-8 text-white" />
                  </div>
                )}
                <img
                  src={selectedImage}
                  alt="Preview"
                  onLoad={() => setIsPreviewLoading(false)}
                  className={cn(
                    'max-h-[80vh] w-full object-contain transition-opacity duration-300',
                    isPreviewLoading ? 'opacity-0' : 'opacity-100'
                  )}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
