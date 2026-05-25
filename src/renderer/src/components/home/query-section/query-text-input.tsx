import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'

interface QueryTextInputProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
}

export function QueryTextInput({ value, onChange, className }: QueryTextInputProps) {
  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlassIcon className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <Input
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Search by text..."
        className="pl-9"
      />
    </div>
  )
}
