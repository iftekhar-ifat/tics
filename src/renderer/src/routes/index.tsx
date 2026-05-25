import { QueryImageUpload } from '@/components/home/query-section/query-image-upload'
import { QueryTextInput } from '@/components/home/query-section/query-text-input'
import UploadToRoot from '@/components/home/upload-to-root'
import { Button } from '@/components/ui/button'
import { FileWithPreview } from '@/hooks/use-file-upload'
import { ScanIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: HomePage
})

function HomePage(): React.JSX.Element {
  const [files, setFiles] = useState<FileWithPreview[]>([])
  const [textQuery, setTextQuery] = useState('')
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
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-4">
          <QueryTextInput value={textQuery} onChange={setTextQuery} className="flex-1" />
          <UploadToRoot />
        </div>
        <QueryImageUpload accept="image/*" multiple onFilesChange={(f) => setFiles(f)} />
        <div>
          <Button disabled={!textQuery && files.length === 0}>
            <MagnifyingGlassIcon className="h-4 w-4" />
            Search
          </Button>
        </div>
      </div>
    </div>
  )
}
