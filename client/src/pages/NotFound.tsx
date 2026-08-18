import { useNavigate } from 'react-router-dom'
import { CompassIcon } from 'lucide-react'
import Seo from '@/shared/components/layout/Seo'
import { SketchUnderline } from '@/shared/components/ui/HandDrawn'

const NotFound = () => {
  const navigate = useNavigate()
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center gap-5 px-4 text-center text-foreground">
      <Seo title="Page not found" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-primary/10 blur-[130px]" />
      </div>

      <div className="flex items-center justify-center size-16 rounded-organic bg-card border border-border shadow-sticker">
        <CompassIcon className="size-7 text-primary" />
      </div>
      <p className="font-display text-7xl md:text-8xl font-bold bg-gradient-to-b from-primary to-clay bg-clip-text text-transparent">404</p>
      <h1 className="font-display text-[30px] md:text-[40px] font-bold tracking-tight text-foreground">
        This page wandered{' '}
        <span className="relative inline-block whitespace-nowrap text-primary">
          off
          <SketchUnderline className="text-clay" />
        </span>
      </h1>
      <p className="max-w-sm text-[15px] text-muted-foreground">
        The page you're after doesn't exist — or it packed up and moved.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
        <button
          onClick={() => navigate('/')}
          className="rounded-organic-sm bg-primary px-6 py-2.5 font-semibold text-primary-foreground shadow-sticker-strong tilt-right transition active:scale-95 hover:brightness-105"
        >
          Back to home
        </button>
        <button
          onClick={() => navigate('/community')}
          className="rounded-organic-sm bg-card border border-border px-6 py-2.5 font-medium text-foreground transition hover:border-primary/50 active:scale-95"
        >
          Explore community
        </button>
      </div>
    </div>
  )
}

export default NotFound
