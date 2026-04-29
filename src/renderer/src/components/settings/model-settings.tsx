import { useState, useEffect } from 'react'
import { CpuIcon, DownloadSimpleIcon, SparkleIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useAppStore } from '@/stores'
import { useBackendEvents } from '@/hooks/use-backend-events'
import { ModelFolderSection } from './model-folder-section'

export function ModelSettings(): React.JSX.Element {
  const { hardwareInfo } = useAppStore()
  const modelStatus = useAppStore((s) => s.modelStatus)
  const downloadProgress = useAppStore((s) => s.downloadProgress)
  const setModelStatus = useAppStore((s) => s.setModelStatus)
  const setDownloadProgress = useAppStore((s) => s.setDownloadProgress)

  const { onMessage } = useBackendEvents()
  const [faissSize] = useState(0)
  const [vectorCount] = useState(0)
  const [downloadSpeed, setDownloadSpeed] = useState(0)

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await window.api.model.getStatus()
        if (result.ok && result.data?.ready) {
          setModelStatus('complete')
          setDownloadProgress(100)
        }
      } catch {
        // backend not ready
      }
    }
    void checkStatus()
  }, [setModelStatus, setDownloadProgress])

  useEffect(() => {
    const handler = (data: unknown): void => {
      const msg = data as {
        type?: string
        data?: { percent?: number; speed?: number }
        percent?: number
        speed?: number
      }
      const eventData = msg.data || msg

      if (msg.type === 'model_download') {
        setDownloadProgress(eventData.percent ?? 0)
        setDownloadSpeed(eventData.speed ?? 0)
      }
      if (msg.type === 'model_download_complete') {
        setModelStatus('complete')
        setDownloadProgress(100)
        setDownloadSpeed(0)
      }
      if (msg.type === 'model_download_cancelled') {
        setModelStatus('default')
        setDownloadProgress(0)
        setDownloadSpeed(0)
      }
      if (msg.type === 'model_download_error') {
        setModelStatus('failed')
        setDownloadProgress(0)
        setDownloadSpeed(0)
      }
    }

    const unsubscribe = onMessage(handler)
    return unsubscribe
  }, [onMessage, setDownloadProgress, setModelStatus])

  const handleDownload = async () => {
    try {
      setModelStatus('downloading')
      setDownloadProgress(0)
      setDownloadSpeed(0)
      await window.api.model.download()
    } catch {
      setModelStatus('failed')
    }
  }

  const handleCancel = async () => {
    await window.api.model.cancelDownload()
    setModelStatus('default')
    setDownloadProgress(0)
    setDownloadSpeed(0)
  }

  const handleMoveFolder = async (newDir: string) => {
    const result = await window.api.model.moveFolder(newDir)
    if (!result.ok) {
      throw new Error(result.message || 'Failed to move folder')
    }
    return result.data
  }

  return (
    <>
      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle className="flex gap-2 items-center text-base">
            <SparkleIcon className="text-muted-foreground" size={24} /> Model
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-1">
          {/* Model Selector */}
          <div className="flex items-center justify-between gap-2">
            <Select defaultValue="clip-vit-b-32">
              <SelectTrigger className="w-48 h-8 text-xs">
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

            {modelStatus === 'default' && (
              <Button size="sm" variant="outline" className="shrink-0" onClick={handleDownload}>
                <DownloadSimpleIcon className="mr-1 size-3" /> Download
              </Button>
            )}
            {modelStatus === 'downloading' && (
              <Button size="sm" variant="outline" className="shrink-0" onClick={handleCancel}>
                Cancel
              </Button>
            )}
            {modelStatus === 'complete' && (
              <Button size="sm" variant="outline" className="shrink-0" disabled>
                Downloaded
              </Button>
            )}
            {modelStatus === 'failed' && (
              <Button size="sm" variant="outline" className="shrink-0" onClick={handleDownload}>
                <DownloadSimpleIcon className="mr-1 size-3" /> Retry
              </Button>
            )}
          </div>

          {/* Download Progress */}
          {modelStatus === 'downloading' && (
            <div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {Math.round(downloadProgress)}%{downloadSpeed > 0 && ` · ${downloadSpeed} MB/s`}
              </p>
            </div>
          )}

          {modelStatus === 'failed' && (
            <p className="text-xs text-destructive">Download failed. Please retry.</p>
          )}

          {/* Stats & Device */}
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CpuIcon size={14} />
              {hardwareInfo?.inferenceDevice?.toUpperCase() || 'CPU'}
            </span>
            <span>{faissSize.toFixed(2)} MB</span>
            <span>{vectorCount.toLocaleString()} vectors</span>
          </div>
        </CardContent>
      </Card>

      <ModelFolderSection onMoveFolder={handleMoveFolder} />
    </>
  )
}
