'use client'

import { useSettingsStore } from '@/stores/settings-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

export function IndexingSection(): React.JSX.Element {
  const {
    watcherPaused,
    indexedExtensions,
    skipHiddenFolders,
    setWatcherPaused,
    setIndexedExtension,
    setSkipHiddenFolders
  } = useSettingsStore()

  const extensions = [
    { key: 'jpg', label: 'JPG' },
    { key: 'jpeg', label: 'JPEG' },
    { key: 'png', label: 'PNG' },
    { key: 'webp', label: 'WebP' },
    { key: 'heic', label: 'HEIC' },
    { key: 'gif', label: 'GIF' },
    { key: 'tiff', label: 'TIFF' }
  ] as const

  return (
    <Card className="rounded-none border-b-0 border-x-0 bg-card shadow-none">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm">Indexing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-4 pb-4">
        {/* File System Watcher Toggle */}
        <div className="flex items-center justify-between rounded-none border border-border bg-muted/50 p-3">
          <div className="space-y-0.5">
            <Label className="text-sm">Pause File System Watcher</Label>
            <p className="text-xs text-muted-foreground">
              Temporarily disable automatic folder scanning
            </p>
          </div>
          <Switch
            checked={watcherPaused}
            onCheckedChange={setWatcherPaused}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
          />
        </div>

        <Separator />

        {/* File Extensions Checklist */}
        <div className="space-y-2">
          <Label className="text-sm">File Extensions to Index</Label>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {extensions.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`ext-${key}`}
                  checked={indexedExtensions[key]}
                  onCheckedChange={(checked) => setIndexedExtension(key, checked as boolean)}
                />
                <Label htmlFor={`ext-${key}`} className="text-xs font-normal cursor-pointer">
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Skip Hidden Folders Toggle */}
        <div className="flex items-center justify-between rounded-none border border-border bg-muted/50 p-3">
          <div className="space-y-0.5">
            <Label className="text-sm">Skip Hidden Folders</Label>
            <p className="text-xs text-muted-foreground">
              Exclude folders starting with . (dot) from indexing
            </p>
          </div>
          <Switch
            checked={skipHiddenFolders}
            onCheckedChange={setSkipHiddenFolders}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
          />
        </div>
      </CardContent>
    </Card>
  )
}
