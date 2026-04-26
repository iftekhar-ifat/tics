'use client'

import { useState, useEffect } from 'react'
import { CpuIcon, DownloadSimpleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { useAppStore } from '@/stores'

interface ModelSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}

function ModelSelector({ value, onChange, disabled }: ModelSelectorProps): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Model</Label>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Select value={value} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger
                  className="h-8 w-full rounded-none border bg-background text-xs disabled:cursor-not-allowed"
                  aria-label="Select model"
                >
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="rounded-none border bg-popover">
                  <SelectItem value="clip-vit-b-32" className="text-xs">
                    CLIP ViT-B/32
                  </SelectItem>
                  <SelectItem value="clip-vit-l-14" className="text-xs">
                    CLIP ViT-L/14
                  </SelectItem>
                  <SelectItem value="clip-vit-h-14" className="text-xs">
                    CLIP ViT-H/14
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="rounded-none border bg-popover px-2 py-1 text-xs">
            More models coming soon
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

function DeviceBadge({ device }: { device: string }): React.JSX.Element {
  const getDeviceLabel = (dev: string) => {
    switch (dev.toLowerCase()) {
      case 'cpu':
        return 'CPU'
      case 'cuda':
        return 'CUDA'
      case 'mps':
        return 'MPS'
      default:
        return dev.toUpperCase()
    }
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-none border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
      <CpuIcon className="size-3" />
      {getDeviceLabel(device)}
    </span>
  )
}

export function ModelSection(): React.JSX.Element {
  const { hardwareInfo } = useAppStore()
  const [modelStatus, setModelStatus] = useState<'idle' | 'downloading' | 'downloaded'>('idle')
  const [faissSize] = useState(0)
  const [vectorCount] = useState(0)
  const [selectedModel, setSelectedModel] = useState('clip-vit-b-32')

  useEffect(() => {
    // Fetch model status and index info on mount
    const fetchModelInfo = async () => {
      try {
        const result = await window.api.model.getStatus()
        if (result.ok && result.data?.ready) {
          setModelStatus('downloaded')
        }
      } catch (err) {
        // Model not downloaded yet
      }
    }

    fetchModelInfo()
  }, [])

  const handleReDownloadModel = async () => {
    setModelStatus('downloading')
    try {
      await window.api.model.download()
      setModelStatus('downloaded')
    } catch (err) {
      setModelStatus('idle')
    }
  }

  return (
    <Card className="rounded-none border-b-0 border-x-0 bg-card shadow-none">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm">Model</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {/* Model Name Card */}
        <div className="rounded-none border border-border bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <CpuIcon className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium">CLIP ViT-B/32</span>
          </div>
        </div>

        {/* Inference Device */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-muted-foreground">Inference Device</Label>
            <div className="mt-1">
              <DeviceBadge device={hardwareInfo?.inferenceDevice || 'CPU'} />
            </div>
          </div>
        </div>

        {/* Model Selector */}
        <ModelSelector value={selectedModel} onChange={setSelectedModel} disabled={true} />

        {/* Index Stats */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">FAISS Index Size</Label>
            <div className="mt-1 text-xs">{faissSize.toFixed(2)} MB</div>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Total Vectors</Label>
            <div className="mt-1 text-xs">{vectorCount.toLocaleString()}</div>
          </div>
        </div>

        {/* Re-download Button */}
        <div className="flex items-center gap-4 pt-1">
          <Button
            variant="outline"
            size="xs"
            onClick={handleReDownloadModel}
            disabled={modelStatus === 'downloading'}
            className="h-7 rounded-none border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {modelStatus === 'downloading' ? (
              <>
                <span className="mr-1 size-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Downloading...
              </>
            ) : (
              <>
                <DownloadSimpleIcon className="mr-1 size-3" />
                Re-download Model
              </>
            )}
          </Button>
        </div>

        {/* Inference Device */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-muted-foreground">Inference Device</Label>
            <div className="mt-1">
              <DeviceBadge device={hardwareInfo?.inferenceDevice || 'CPU'} />
            </div>
          </div>
        </div>

        {/* Model Selector */}
        <ModelSelector value={selectedModel} onChange={setSelectedModel} disabled={true} />

        {/* Index Stats */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">FAISS Index Size</Label>
            <div className="mt-1 text-xs">{faissSize.toFixed(2)} MB</div>
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Total Vectors</Label>
            <div className="mt-1 text-xs">{vectorCount.toLocaleString()}</div>
          </div>
        </div>

        {/* Re-download Button */}
        <div className="flex items-center gap-4 pt-1">
          <Button
            variant="outline"
            size="xs"
            onClick={handleReDownloadModel}
            disabled={modelStatus === 'downloading'}
            className="h-7 rounded-none border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {modelStatus === 'downloading' ? (
              <>
                <span className="mr-1 size-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Downloading...
              </>
            ) : (
              <>
                <DownloadSimpleIcon className="mr-1 size-3" />
                Re-download Model
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
