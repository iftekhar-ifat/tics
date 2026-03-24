import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const HomeSearchSchema = z.object({
  q: z.string().optional()
})

export const Route = createFileRoute('/')({
  validateSearch: HomeSearchSchema,
  component: HomePage
})

interface BackendStatus {
  status: 'starting' | 'running' | 'stopped' | 'error'
  url: string | null
}

interface HttpStatusResponse {
  ok: boolean
  data?: {
    status: string
    uptime: string
    connected_clients: number
    random_value: number
  }
  message?: string
}

function HomePage(): React.JSX.Element {
  const { q } = Route.useSearch()
  const [version, setVersion] = useState<string>('...')
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    status: 'stopped',
    url: null
  })
  const [httpStatus, setHttpStatus] = useState<HttpStatusResponse | null>(null)

  useEffect(() => {
    // Get app version
    void window.api.app.getVersion().then(setVersion)

    // Get initial backend status
    void window.api.backend.getStatus().then(setBackendStatus)

    // Listen for backend status changes
    const unsubscribe = window.api.backend.onStatusChanged((status) => {
      setBackendStatus(status)
      // Fetch HTTP status when backend becomes running
      if (status.status === 'running') {
        void window.api.backend.getHttpStatus().then(setHttpStatus)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleRefreshHttpStatus = async () => {
    const result = await window.api.backend.getHttpStatus()
    setHttpStatus(result)
  }

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
            <span>Python Backend (FastAPI)</span>
            <Badge variant={backendStatus.status === 'running' ? 'default' : 'secondary'}>
              {backendStatus.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <p className="text-muted-foreground">Status: {backendStatus.status}</p>
            {backendStatus.url && <p className="text-muted-foreground">URL: {backendStatus.url}</p>}
          </div>

          {backendStatus.status === 'running' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Backend API Status</p>
                <Button variant="outline" size="sm" onClick={handleRefreshHttpStatus}>
                  Refresh
                </Button>
              </div>
              {httpStatus && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p>Status: {httpStatus.data?.status}</p>
                  <p>Connected Clients: {httpStatus.data?.connected_clients}</p>
                  <p>Random Value: {httpStatus.data?.random_value}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
