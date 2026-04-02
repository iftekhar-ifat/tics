import { useOnboardingStore } from '@/stores/onboarding-store'
import { Button } from '@/components/ui/button'
import { FolderOpenIcon } from '@phosphor-icons/react'

export function Step01Library(): React.JSX.Element {
  const { folderInfo, setFolderInfo } = useOnboardingStore()

  const handleBrowseFolder = async () => {
    const result = await window.api.dialog.openDirectory()
    if (result && !result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      const name = path.split(/[/\\]/).pop() || path
      const { imageCount, totalSize } = await window.api.folder.scanFolder(path)
      setFolderInfo({
        path,
        name,
        imageCount,
        totalSize
      })
    }
  }

  const handleChangeFolder = () => {
    setFolderInfo(null)
  }

  const formatSize = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb >= 0.1) return `${gb.toFixed(1)} GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  if (folderInfo) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <p className="font-medium text-sm">{folderInfo.name}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{folderInfo.path}</p>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span>{formatNumber(folderInfo.imageCount)} images found</span>
            <span>{formatSize(folderInfo.totalSize)}</span>
          </div>
        </div>
        <button
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={handleChangeFolder}
          type="button"
        >
          Change folder
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="flex h-48 w-full max-w-sm flex-col items-center justify-center rounded-md border-2 border-dashed border-border">
        <FolderOpenIcon className="mb-2 size-10 text-muted-foreground" />
        <p className="text-sm">Select a folder</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={handleBrowseFolder}>
          Browse Folder
        </Button>
      </div>
    </div>
  )
}
