import { useEffect } from 'react'
import { useAppStore } from '@/stores/app-store'

export function useFolderWatcher() {
  const rootFolder = useAppStore((s) => s.rootFolder)
  const setFolderStats = useAppStore((s) => s.setFolderStats)

  useEffect(() => {
    if (!rootFolder?.path) return

    window.api.folderWatcher.start(rootFolder.path)

    const unsub = window.api.folderWatcher.onUpdate((data) => {
      setFolderStats({ imageCount: data.imageCount, totalSize: data.totalSize })
    })

    return () => unsub()
  }, [rootFolder?.path, setFolderStats])
}
