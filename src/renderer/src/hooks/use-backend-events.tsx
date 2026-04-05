import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback
} from 'react'

type BackendEventsHook = {
  isConnected: boolean
  send: (data: unknown) => void
  onMessage: (handler: (data: unknown) => void) => () => void
}

const BackendEventsContext = createContext<BackendEventsHook>({
  isConnected: false,
  send: () => {},
  onMessage: () => () => {}
})

export function useBackendEvents(): BackendEventsHook {
  return useContext(BackendEventsContext)
}

interface BackendEventsProviderProps {
  children: ReactNode
}

export function BackendEventsProvider({ children }: BackendEventsProviderProps): React.JSX.Element {
  const [isConnected, setIsConnected] = useState(false)
  const handlersRef = useRef<Set<(data: unknown) => void>>(new Set())

  const broadcast = useCallback((data: unknown): void => {
    handlersRef.current.forEach((handler) => handler(data))
  }, [])

  useEffect(() => {
    const unsubscribeStatus = window.api.backend.onStatusChanged((status) => {
      setIsConnected(status.status === 'running')
    })

    const unsubscribeEvents = window.api.backend.onEvent((event) => {
      broadcast(event)
    })

    void window.api.backend.getStatus().then((status) => {
      setIsConnected(status.status === 'running')
    })

    return () => {
      unsubscribeStatus()
      unsubscribeEvents()
    }
  }, [broadcast])

  const send = useCallback(() => {
    console.warn('send() not available - IPC bridge is request/response only')
  }, [])

  const onMessage = useCallback((handler: (data: unknown) => void): (() => void) => {
    handlersRef.current.add(handler)
    return () => handlersRef.current.delete(handler)
  }, [])

  return (
    <BackendEventsContext.Provider value={{ isConnected, send, onMessage }}>
      {children}
    </BackendEventsContext.Provider>
  )
}
