import { useState, useRef, useCallback } from 'react'
import { ImageIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import ImageCard from '@/components/ui/image-card'
import type { FileWithPreview } from '@/hooks/use-file-upload'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend?: (text: string, images: File[]) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...'
}: ChatInputProps) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<FileWithPreview[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const autoResize = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }

  const addImages = useCallback((files: File[]) => {
    const first = files.find((f) => f.type.startsWith('image/'))
    if (!first) return
    // Revoke previous preview
    setImages((prev) => {
      prev.forEach((i) => i.preview && URL.revokeObjectURL(i.preview))
      return []
    })
    setImages([
      {
        id: `${first.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file: first,
        preview: URL.createObjectURL(first)
      }
    ])
  }, [])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addImages(Array.from(e.target.files))
      e.target.value = ''
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageFiles = items
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => {
        const file = item.getAsFile()
        if (!file) return null
        if (!file.name || file.name === 'image.png') {
          const ext = file.type.split('/')[1] || 'png'
          return new File([file], `clipboard-image.${ext}`, { type: file.type })
        }
        return file
      })
      .filter(Boolean) as File[]

    if (imageFiles.length > 0) {
      e.preventDefault()
      addImages(imageFiles)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      addImages(Array.from(e.dataTransfer.files))
    }
  }

  const handleSend = () => {
    if (disabled || (!text.trim() && images.length === 0)) return
    const filesToSend = images
      .map((i) => i.file)
      .filter((file): file is File => file instanceof File)

    onSend?.(text, filesToSend)
    setText('')
    images.forEach((i) => {
      if (i.preview) URL.revokeObjectURL(i.preview)
    })
    setImages([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasContent = text.trim() || images.length > 0

  return (
    <div
      className={cn(
        'relative border transition-colors',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/20 hover:border-muted-foreground/40'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Image previews above textarea */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-4">
          {images.map((img) => (
            <div key={img.id} className="size-16">
              <ImageCard
                fileItem={img}
                ready
                onView={() => {
                  setSelectedImage(img.preview!)
                  setIsPreviewLoading(true)
                }}
                onRemove={() => removeImage(img.id)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-4 py-3">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            autoResize()
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="min-h-[24px] max-h-[120px] resize-none border-0 !bg-transparent p-0 !text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-2">
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <ImageIcon className="size-5" />
          </Button>
          <Select defaultValue="clip-vit-b-32">
            <SelectTrigger className="h-7 border-0 px-2 text-xs text-muted-foreground shadow-none hover:text-foreground [&>svg]:text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clip-vit-b-32" className="text-xs">
                CLIP ViT-B/32
              </SelectItem>
              <SelectItem value="clip-vit-l-14" className="text-xs" disabled>
                CLIP ViT-L/14 — coming soon
              </SelectItem>
              <SelectItem value="siglip" className="text-xs" disabled>
                SigLIP — coming soon
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            className={cn(
              'size-8 shrink-0',
              hasContent
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground'
            )}
            onClick={handleSend}
            disabled={!hasContent || disabled}
          >
            <PaperPlaneTiltIcon weight="fill" />
          </Button>
        </div>
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent
          aria-describedby={undefined}
          className="**:data-[slot=dialog-close]:text-muted-foreground **:data-[slot=dialog-close]:hover:text-foreground **:data-[slot=dialog-close]:bg-background w-max border-none bg-transparent p-0 shadow-none sm:max-w-1/2 **:data-[slot=dialog-close]:-inset-e-7 **:data-[slot=dialog-close]:-top-7 **:data-[slot=dialog-close]:size-7"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="flex w-auto items-center justify-center">
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileSelect}
      />
    </div>
  )
}
