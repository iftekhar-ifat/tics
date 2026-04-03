import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback
} from 'react'

type WebSocketHook = {
  isConnected: boolean
  send: (data: unknown) => void
  onMessage: (handler: (data: unknown) => void) => () => void
}

const WebSocketContext = createContext<WebSocketHook>({
  isConnected: false,
  send: () => {},
  onMessage: () => () => {}
})

export function useWebSocket(): WebSocketHook {
  return useContext(WebSocketContext)
}

interface WebSocketProviderProps {
  children: ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps): React.JSX.Element {
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const urlRef = useRef<string | null>(null)
  const handlersRef = useRef<Set<(data: unknown) => void>>(new Set())

  const broadcast = useCallback((data: unknown): void => {
    handlersRef.current.forEach((handler) => handler(data))
  }, [])

  useEffect(() => {
    let cancelled = false

    const connect = async (): Promise<void> => {
      while (!cancelled) {
        try {
          const status = await window.api.backend.getStatus()
          if (status.status !== 'running' || cancelled) {
            await new Promise((r) => setTimeout(r, 500))
            continue
          }

          const wsUrl = status.url?.replace('http', 'ws') + '/ws'
          if (!wsUrl || wsUrl === urlRef.current) {
            await new Promise((r) => setTimeout(r, 500))
            continue
          }

          urlRef.current = wsUrl
          const ws = new WebSocket(wsUrl)

          ws.onopen = () => {
            if (!cancelled) {
              setIsConnected(true)
              wsRef.current = ws
            }
          }

          ws.onmessage = (event) => {
            if (!cancelled) {
              try {
                const data = JSON.parse(event.data)
                broadcast(data)
              } catch {
                // ignore non-JSON
              }
            }
          }

          ws.onclose = () => {
            if (!cancelled) {
              setIsConnected(false)
              wsRef.current = null
              urlRef.current = null
            }
          }

          ws.onerror = () => {
            if (!cancelled) {
              setIsConnected(false)
              wsRef.current = null
            }
          }

          return
        } catch {
          await new Promise((r) => setTimeout(r, 500))
        }
      }
    }

    void connect()

    return () => {
      cancelled = true
      wsRef.current?.close()
    }
  }, [broadcast])

  const send = useCallback((data: unknown): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  const onMessage = useCallback((handler: (data: unknown) => void): (() => void) => {
    handlersRef.current.add(handler)
    return () => handlersRef.current.delete(handler)
  }, [])

  return (
    <WebSocketContext.Provider value={{ isConnected, send, onMessage }}>
      {children}
    </WebSocketContext.Provider>
  )
}
