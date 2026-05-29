import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ImageIcon } from '@phosphor-icons/react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { createImageThumbnail } from '@/utils/image-gallery-helper'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
export interface GalleryImage {
  path: string
  name: string
  score: number
}

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml'
}

async function readFileAsBlobUrl(path: string): Promise<string> {
  try {
    const uint8 = await window.api.file.readFile(path)
    const name = path.split(/[/\\]/).pop() || 'image'
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    const type = MIME_TYPES[ext] ?? 'application/octet-stream'
    const file = new File([uint8 as unknown as ArrayBuffer], name, { type })
    return await createImageThumbnail(file, 200)
  } catch {
    return ''
  }
}

interface GalleryCardProps {
  image: GalleryImage
}

function GalleryCard({ image }: GalleryCardProps) {
  const [thumb, setThumb] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    readFileAsBlobUrl(image.path).then((url) => {
      if (mountedRef.current) setThumb(url)
    })
    return () => {
      mountedRef.current = false
    }
  }, [image.path])

  return (
    <div
      className="group relative aspect-square cursor-pointer overflow-hidden border"
      onDoubleClick={() => window.api.file.openItem(image.path)}
    >
      {!thumb || !loaded ? (
        <div className="bg-muted/50 absolute inset-0 flex items-center justify-center">
          <ImageIcon className="text-muted-foreground/50 h-8 w-8" />
        </div>
      ) : null}
      {thumb && (
        <img
          src={thumb}
          alt={image.name}
          onLoad={() => setLoaded(true)}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
      <Badge variant="secondary" className="absolute top-0 right-0 shrink-0 text-xs bg-background">
        Sim {image.score.toFixed(1)}%
      </Badge>
      <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5">
        <span className="block min-w-0 truncate text-xs text-white">{image.name}</span>
      </div>
    </div>
  )
}

interface ImageGalleryProps {
  images: GalleryImage[]
  pageSize?: number
}

export default function ImageGallery({ images, pageSize = 20 }: ImageGalleryProps) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const visibleImages = images.slice(0, visibleCount)
  const hasMore = visibleCount < images.length

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + pageSize)
  }, [pageSize])

  if (images.length === 0) return null

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="px-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visibleImages.map((img) => (
          <GalleryCard key={img.path} image={img} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}
