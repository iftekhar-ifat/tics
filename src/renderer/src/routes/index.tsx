import UploadToRoot from '@/components/home/upload-to-root'
import { ScanIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage
})

function HomePage(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="bg-sidebar flex shrink-0 flex-col border-b px-4 py-4">
        <div className="flex gap-2 items-center">
          <ScanIcon size={20} />
          <h1 className="text-lg font-semibold tracking-wider">Search</h1>
        </div>
        <div className="mt-1">
          <p className="text-xs text-muted-foreground">
            Upload a photo and/or enter a text query to find similar photos in the root folder
          </p>
        </div>
      </div>
      <div className="p-4">
        <UploadToRoot />
      </div>
    </div>
  )
}
