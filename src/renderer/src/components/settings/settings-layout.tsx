import { type ReactNode } from 'react'

export function SettingsLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="flex flex-col gap-4">{children}</div>
}
