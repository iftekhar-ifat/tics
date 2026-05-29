import ChatInput from '@/components/ui/chat-input'
import UploadToRoot from '@/components/home/upload-to-root'
import ImageGallery from '@/components/home/image-gallery'
import type { GalleryImage } from '@/components/home/image-gallery'
import { useAppStore } from '@/stores/app-store'
import { useSettingsStore } from '@/stores/settings-store'
import { ScanIcon, TrashIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import HomeScreen from '@/components/home/home-screen'
import LoadingLogo from '@/components/ui/loading-logo'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage
})

function HomePage(): React.JSX.Element {
  const rootFolder = useAppStore((s) => s.rootFolder)
  const topK = useSettingsStore((s) => s.topK)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [queryImagePreview, setQueryImagePreview] = useState<string | null>(null)

  const handleSend = useCallback(
    async (text: string, imageFiles: File[]) => {
      if (!rootFolder) return

      setSearching(true)

      let queryPreview: string | null = null
      let imageData = ''
      if (imageFiles.length > 0) {
        const file = imageFiles[0]
        queryPreview = URL.createObjectURL(file)
        const bytes = new Uint8Array(await file.arrayBuffer())
        const binary = bytes.reduce((acc, b) => acc + String.fromCharCode(b), '')
        imageData = btoa(binary)
      }
      setQueryImagePreview(queryPreview)

      const result = await window.api.search.query({
        text: text.trim(),
        imageData,
        rootPath: rootFolder.path,
        topK
      })

      if (result.ok && result.data) {
        setGalleryImages(result.data.results)
      } else {
        console.error('Search failed:', result.message)
      }

      setSearching(false)
    },
    [rootFolder, topK]
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

        <div className="min-h-0 flex-1">
          {galleryImages && galleryImages.length > 0 ? (
            <div className="flex h-full flex-col">
              <div className="mb-3 flex items-center gap-4">
                {queryImagePreview && (
                  <div className="size-10 shrink-0 overflow-hidden rounded border">
                    <img
                      src={queryImagePreview}
                      alt="Query"
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="w-full flex justify-between">
                  <h2 className="font-mono text-lg font-semibold">
                    Top {galleryImages.length} similar images
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGalleryImages(null)
                      setQueryImagePreview(null)
                    }}
                  >
                    <TrashIcon />
                    Clear
                  </Button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <ImageGallery images={galleryImages} />
              </div>
            </div>
          ) : galleryImages && galleryImages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground text-sm">No results found</p>
            </div>
          ) : (
            // pb-16 is needed to keep the <HomeScreen /> in the middle
            <div className="pb-16 flex h-full items-center justify-center">
              {searching ? <LoadingLogo text="Searching..." /> : <HomeScreen />}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-2xl shrink-0">
          <ChatInput onSend={handleSend} placeholder="Search by text, image, or both..." />
        </div>
      </div>
    </div>
  )
}
