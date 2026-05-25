import ChatInput from '@/components/ui/chat-input'
import UploadToRoot from '@/components/home/upload-to-root'
import ImageGallery from '@/components/home/image-gallery'
import type { GalleryImage } from '@/components/home/image-gallery'
import { useAppStore } from '@/stores/app-store'
import { ScanIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: HomePage
})

function HomePage(): React.JSX.Element {
  const rootFolder = useAppStore((s) => s.rootFolder)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])

  useEffect(() => {
    if (!rootFolder) return
    window.api.folder.getAllImages(rootFolder.path).then((images) => {
      setGalleryImages(
        images.map((img) => ({
          path: img.path,
          name: img.name,
          score: 0
        }))
      )
    })
  }, [rootFolder])

  return (
    <div className="flex h-full flex-col">
      <div className="bg-sidebar flex shrink-0 flex-col border-b px-4 py-4">
        <div className="flex items-center gap-2">
          <ScanIcon size={20} />
          <h1 className="text-lg font-semibold tracking-wider">Search</h1>
        </div>
        <div className="mt-1">
          <p className="text-xs text-muted-foreground">
            Upload a photo and/or enter a text query to find similar photos in the root folder
          </p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex justify-end">
          <UploadToRoot />
        </div>
        <div className="min-h-0 flex-1">
          <ImageGallery images={galleryImages} />
        </div>
        <div className="mx-auto w-full max-w-2xl shrink-0">
          <ChatInput placeholder="Search by text, image, or both..." />
        </div>
      </div>
    </div>
  )
}
