import { useEffect, useRef, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { AuthView } from "@daveyplate/better-auth-ui"
import { assets } from "../../assets/assets"
import AuthBot, { type BotMode } from "../../components/AuthBot"

const copyMap: Record<string, { h: string; s: string }> = {
  "sign-in": { h: "Welcome back", s: "Sign in to continue building." },
  "sign-up": { h: "Create your account", s: "Start turning ideas into websites." },
  "forgot-password": { h: "Reset your password", s: "We'll email you a reset link." },
  "reset-password": { h: "Set a new password", s: "Choose a strong, memorable password." },
}

export default function AuthPage() {
  const { pathname } = useParams()
  const copy = copyMap[pathname ?? "sign-in"] ?? { h: "Account", s: "Manage your access." }
  const [botMode, setBotMode] = useState<BotMode>('idle')
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const onIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement
      if (t instanceof HTMLInputElement && t.type === 'password') setBotMode('cover')
      else if (t.matches?.('input, textarea, select')) setBotMode('peek')
    }
    const onOut = (e: FocusEvent) => {
      const next = e.relatedTarget as HTMLElement | null
      if (!next || !next.matches?.('input, textarea, select')) setBotMode('idle')
    }
    el.addEventListener('focusin', onIn)
    el.addEventListener('focusout', onOut)
    return () => {
      el.removeEventListener('focusin', onIn)
      el.removeEventListener('focusout', onOut)
    }
  }, [])

  return (
    <main className="relative min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 overflow-hidden text-white">
      {}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[38rem] h-[38rem] rounded-full bg-indigo-600/20 blur-[130px] animate-aurora" />
        <div className="absolute bottom-0 right-0 w-[26rem] h-[26rem] rounded-full bg-fuchsia-600/15 blur-[120px] animate-aurora" style={{ animationDelay: "5s" }} />
      </div>

      <Link to="/" className="flex items-center gap-2 mb-8 animate-fade-in-down hover:scale-105 smooth-transition">
        <img src={assets.logo} alt="logo" className="h-7" />
      </Link>

      <div className="w-full max-w-md animate-fade-in-up">
        <div className="flex justify-center -mb-5 relative z-10 pointer-events-none">
          <AuthBot mode={botMode} />
        </div>
        <div className="gradient-border rounded-2xl p-px shadow-premium">
          <div ref={cardRef} className="rounded-2xl bg-zinc-950/85 backdrop-blur-xl p-7 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="text-shimmer text-2xl font-semibold tracking-tight">{copy.h}</h1>
              <p className="text-gray-400 text-sm mt-1.5">{copy.s}</p>
            </div>
            <AuthView pathname={pathname} classNames={{ base: "bg-transparent border-0 shadow-none" }} />
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">
          By continuing you agree to our{" "}
          <a href="#" className="text-gray-400 hover:text-indigo-400 smooth-transition">Terms</a> &{" "}
          <a href="#" className="text-gray-400 hover:text-indigo-400 smooth-transition">Privacy Policy</a>.
        </p>
      </div>
    </main>
  )
}
