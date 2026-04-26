import { createFileRoute } from '@tanstack/react-router'
import { SettingsLayout } from '@/components/settings/settings-layout'
import { FoldersSection } from '@/components/settings/folders-section'
import { ModelSection } from '@/components/settings/model-section'
import { SearchDefaultsSection } from '@/components/settings/search-defaults-section'
import { IndexingSection } from '@/components/settings/indexing-section'
import { AboutSection } from '@/components/settings/about-section'

export const Route = createFileRoute('/settings')({
  component: SettingsPage
})

function SettingsPage(): React.JSX.Element {
  return (
    <SettingsLayout>
      <FoldersSection />
      <ModelSection />
      <SearchDefaultsSection />
      <IndexingSection />
      <AboutSection />
    </SettingsLayout>
  )
}
