import { createFileRoute } from '@tanstack/react-router'
import { FoldersSection } from '@/components/settings/folders-section'

export const Route = createFileRoute('/settings')({
  component: SettingsPage
})

function SettingsPage(): React.JSX.Element {
  return (
    <div>
      <FoldersSection />
    </div>
  )
}
