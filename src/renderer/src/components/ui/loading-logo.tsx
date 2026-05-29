import TicsLogo from '@/assets/logo-loading.svg'

export default function LoadingLogo({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-center">
        <div className="flex h-40 w-40 items-center justify-center">
          <img
            src={TicsLogo}
            alt="Tics Logo"
            className="h-full w-full object-contain animate-pulse"
            style={{
              animationDuration: '2s'
            }}
          />
        </div>
      </div>
      <span
        className="font-mono text-lg text-muted-foreground tracking-widest animate-pulse"
        style={{ animationDuration: '2s' }}
      >
        {text ?? 'TICS'}
      </span>
    </div>
  )
}
