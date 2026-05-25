import { FileWithPreview } from '@/hooks/use-file-upload'
import { cn } from '@/lib/utils'
import { ImageIcon, MagnifyingGlassPlusIcon, XIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { Button } from './button'

export default function ImageCard({
  fileItem,
  ready,
  onView,
  onRemove
}: {
  fileItem: FileWithPreview
  ready: boolean
  onView: () => void
  onRemove: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const isImg = fileItem.file.type.startsWith('image/')
  const src = fileItem.thumbnail ?? fileItem.preview

  if (!ready) {
    return <div className="bg-muted/50 aspect-square animate-pulse border" />
  }

  return (
    <div
      className="relative aspect-square"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {isImg && src ? (
        <>
          {!loaded && (
            <div className="bg-muted absolute inset-0 flex items-center justify-center border" />
          )}
          <img
            src={src}
            alt={fileItem.file.name}
            onLoad={() => setLoaded(true)}
            className={cn(
              'h-full w-full border object-cover transition-opacity duration-300',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        </>
      ) : (
        <div className="bg-muted flex h-full w-full items-center justify-center border">
          <ImageIcon className="text-muted-foreground h-8 w-8" />
        </div>
      )}

      {/* Overlay */}
      <div
        className={cn(
          'bg-black/50 absolute inset-0 z-10 flex items-center justify-center gap-2 transition-opacity duration-150 select-none',
          hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onDoubleClick={onView}
      >
        {fileItem.preview && (
          <Button onClick={onView} variant="secondary" size="icon" className="size-7">
            <MagnifyingGlassPlusIcon />
          </Button>
        )}
        <Button onClick={onRemove} variant="secondary" size="icon" className="size-7">
          <XIcon />
        </Button>
      </div>
    </div>
  )
}
