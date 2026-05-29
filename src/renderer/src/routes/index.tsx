import ChatInput from '@/components/ui/chat-input'
import UploadToRoot from '@/components/home/upload-to-root'
import ImageGallery from '@/components/home/image-gallery'
import type { GalleryImage } from '@/components/home/image-gallery'
import { useAppStore } from '@/stores/app-store'
import { ScanIcon, SpinnerIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import HomeScreen from '@/components/home/home-screen'

export const Route = createFileRoute('/')({
  component: HomePage
})

function HomePage(): React.JSX.Element {
  const rootFolder = useAppStore((s) => s.rootFolder)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[] | null>(null)
  const [searching, setSearching] = useState(false)

  const handleSend = useCallback(
    async (text: string, imageFiles: File[]) => {
      if (!rootFolder) return

      setSearching(true)

      let imagePath = ''
      if (imageFiles.length > 0) {
        const file = imageFiles[0]
        const result = await window.api.file.copyToRoot(
          rootFolder.path,
          file.name,
          await file.arrayBuffer()
        )
        if (result.ok && result.path) {
          imagePath = result.path
        }
      }

      const result = await window.api.search.query({
        text: text.trim(),
        imagePath,
        rootPath: rootFolder.path,
        topK: 50
      })

      if (result.ok && result.data) {
        setGalleryImages(result.data.results)
      } else {
        console.error('Search failed:', result.message)
      }

      setSearching(false)
    },
    [rootFolder]
  )

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
        {searching && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <SpinnerIcon className="size-5 animate-spin" />
            <span className="text-sm">Searching...</span>
          </div>
        )}
        <div className="min-h-0 flex-1">
          {galleryImages && galleryImages.length > 0 ? (
            <div className="flex h-full flex-col">
              <h2 className="mb-3 text-lg font-semibold tracking-wide">
                Results: {galleryImages.length} images
              </h2>
              <div className="min-h-0 flex-1">
                <ImageGallery images={galleryImages} />
              </div>
            </div>
          ) : galleryImages && galleryImages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-sm">No results found</p>
            </div>
          ) : (
            <HomeScreen />
          )}
        </div>

        <div className="mx-auto w-full max-w-2xl shrink-0">
          <ChatInput onSend={handleSend} placeholder="Search by text, image, or both..." />
        </div>
      </div>
    </div>
  )
}
