import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const HomeSearchSchema = z.object({
  q: z.string().optional()
})

export const Route = createFileRoute('/')({
  validateSearch: HomeSearchSchema,
  component: HomePage
})

interface BackendStatus {
  status: 'starting' | 'running' | 'stopped' | 'error'
}

function HomePage(): React.JSX.Element {
  const { q } = Route.useSearch()
  const [version, setVersion] = useState<string>('...')
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    status: 'stopped'
  })

  useEffect(() => {
    // Get app version
    void window.api.app.getVersion().then(setVersion)

    // Get initial backend status
    void window.api.backend.getStatus().then(setBackendStatus)

    // Listen for backend status changes
    const unsubscribe = window.api.backend.onStatusChanged((status) => {
      setBackendStatus(status)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Electron + Vite scaffold ready</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Core release foundations are configured: packaging, updater channel, routing, styling,
            and CI publishing.
          </p>
          <p className="text-xs text-muted-foreground">App version: v{version}</p>
          {q ? <p className="text-xs text-muted-foreground">Search query: {q}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Python Backend (IPC)</span>
            <Badge variant={backendStatus.status === 'running' ? 'default' : 'secondary'}>
              {backendStatus.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Status: <span className="text-muted-foreground">{backendStatus.status}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
