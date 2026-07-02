import { useNavigate } from 'react-router-dom'
import { CompassIcon } from 'lucide-react'
import Seo from '@/shared/components/Seo'

const NotFound = () => {
  const navigate = useNavigate()
  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center gap-5 px-4 text-center text-white">
      <Seo title="Page not found" />
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-indigo-600/15 blur-[130px]" />
      </div>

      <div className="flex items-center justify-center size-16 rounded-2xl glass">
        <CompassIcon className="size-7 text-indigo-300" />
      </div>
      <p className="font-display text-6xl font-bold bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">404</p>
      <h1 className="text-2xl font-semibold">This page wandered off</h1>
      <p className="max-w-sm text-sm text-gray-400">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600 px-6 py-2.5 font-medium text-white transition active:scale-95 hover:shadow-lg hover:shadow-indigo-500/40"
        >
          Back to home
        </button>
        <button
          onClick={() => navigate('/community')}
          className="rounded-lg glass px-6 py-2.5 font-medium text-white transition hover:bg-white/10 active:scale-95"
        >
          Explore community
        </button>
      </div>
    </div>
  )
}

export default NotFound
