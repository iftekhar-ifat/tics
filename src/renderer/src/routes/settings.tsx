import { createFileRoute } from '@tanstack/react-router'
import { GearSixIcon } from '@phosphor-icons/react'
import FolderSettings from '@/components/settings/folder-settings'
import { IndexingSettings } from '@/components/settings/indexing-settings'
import { ModelSettings } from '@/components/settings/model-settings/model-settings'

export const Route = createFileRoute('/settings')({
  component: SettingsPage
})

function SettingsPage(): React.JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="bg-sidebar flex shrink-0 items-center border-b px-4 py-4">
        <div className="flex gap-2 items-center">
          <GearSixIcon size={20} />
          <h1 className="text-lg font-semibold tracking-wider">Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-2 gap-4">
          <FolderSettings />
          <div className="row-span-2">
            <IndexingSettings />
          </div>
          <ModelSettings />
        </div>
      </div>
    </div>
  )
}
