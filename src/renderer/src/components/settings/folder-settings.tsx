import { useEffect } from 'react'
import {
  FolderOpenIcon,
  SwapIcon,
  ImageIcon,
  HardDriveIcon,
  FolderIcon,
  FolderPlusIcon
} from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { useAppStore } from '@/stores'
import { formatBytes } from '@/utils/helper'

export default function FolderSettings() {
  const rootFolder = useAppStore((s) => s.rootFolder)
  const folderStats = useAppStore((s) => s.folderStats)
  const setRootFolder = useAppStore((s) => s.setRootFolder)
  const setFolderStats = useAppStore((s) => s.setFolderStats)

  const handleChangeRootFolder = async () => {
    const result = await window.api.dialog.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      const name = path.split(/[/\\]/).pop() || path
      const scanResult = await window.api.folder.scanFolder(path)
      setRootFolder({ path, name })
      setFolderStats({ imageCount: scanResult.imageCount, totalSize: scanResult.totalSize })
    }
  }

  // Watch the current root folder for file changes and update stats in real time
  useEffect(() => {
    if (!rootFolder?.path) return

    window.api.folderWatcher.start(rootFolder.path)

    const unsub = window.api.folderWatcher.onUpdate((data) => {
      setFolderStats({ imageCount: data.imageCount, totalSize: data.totalSize })
    })

    return () => {
      unsub()
      window.api.folderWatcher.stop()
    }
  }, [rootFolder?.path, setFolderStats])

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle className="flex gap-2 items-center text-base">
          <FolderIcon className="text-muted-foreground" size={24} /> Folder
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 pt-1">
        {rootFolder ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpenIcon size={20} className="text-muted-foreground shrink-0" />
                <p className="font-mono text-sm text-muted-foreground truncate">
                  {rootFolder.path}
                </p>
              </div>
              <Button variant="outline" className="shrink-0" onClick={handleChangeRootFolder}>
                <SwapIcon /> Change
              </Button>
            </div>

            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <ImageIcon size={14} />
                {folderStats.imageCount.toLocaleString()} images
              </span>
              <span className="flex items-center gap-1">
                <HardDriveIcon size={14} />
                {formatBytes(folderStats.totalSize)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">No folder selected</span>
            <Button variant="outline" onClick={handleChangeRootFolder}>
              <FolderPlusIcon /> Select Folder
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
