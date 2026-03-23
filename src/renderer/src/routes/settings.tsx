import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/settings')({
  component: SettingsPage
})

function SettingsPage(): React.JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-2">
        <h1 className="text-lg font-semibold">Settings scaffold</h1>
        <p className="font-mono text-sm text-muted-foreground">
          Use this route as the starting point for folders, indexing, model info, and manual
          re-index controls.
        </p>
      </CardContent>
    </Card>
  )
}
