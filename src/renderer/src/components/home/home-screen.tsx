import TicsLogo from '@/assets/logo-sidebar.svg'

export default function HomeScreen() {
  const ASCII = `
████████╗    ██╗     ██████╗    ███████╗
╚══██╔══╝    ██║    ██╔════╝    ██╔════╝
   ██║       ██║    ██║         ███████╗
   ██║       ██║    ██║         ╚════██║
   ██║       ██║    ╚██████╗    ███████║
   ╚═╝       ╚═╝     ╚═════╝    ╚══════╝
                                        `

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 select-none">
      <div className="flex items-center justify-center">
        <div className="flex h-32 w-32 items-center justify-center">
          <img src={TicsLogo} alt="Tics Logo" className="h-full w-full object-contain" />
        </div>
      </div>
      <div className="bg-gradient-to-b from-foreground via-foreground/70 to-muted bg-clip-text font-mono whitespace-pre leading-5 text-transparent">
        {ASCII}
      </div>
      <span className="font-mono text-md text-muted-foreground tracking-wide">
        Text-Image-Context-Search
      </span>
    </div>
  )
}
