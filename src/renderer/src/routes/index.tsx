import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Card, CardContent } from '@/components/ui/card'

const HomeSearchSchema = z.object({
  q: z.string().optional()
})

export const Route = createFileRoute('/')({
  validateSearch: HomeSearchSchema,
  component: HomePage
})

function HomePage(): React.JSX.Element {
  const { q } = Route.useSearch()

  return (
    <Card>
      <CardContent className="space-y-2">
        <h1 className="text-lg font-semibold">Electron + Vite scaffold ready</h1>
        <p className="text-sm text-muted-foreground">
          Core release foundations are configured: packaging, updater channel, routing, styling, and
          CI publishing.
        </p>
        {q ? <p className="text-xs text-muted-foreground">Search query: {q}</p> : null}
      </CardContent>
    </Card>
  )
}
