import { useEffect, useRef, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { AuthView } from "@daveyplate/better-auth-ui"
import { toast } from "sonner"
import AuthBot, { type BotMode } from "@/features/auth/AuthBot"
import { authClient } from "@/shared/api/auth-client"

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

  // A user who can't sign in because their verification email never arrived (a
  // transient provider outage swallows the send server-side) can trigger a fresh
  // one here instead of being permanently stuck. Only surfaced on the sign-in view.
  const showResend = (pathname ?? "sign-in") === "sign-in"
  const [resendEmail, setResendEmail] = useState("")
  const [resending, setResending] = useState(false)
  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = resendEmail.trim()
    if (!email || resending) return
    setResending(true)
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/" })
      // Neutral wording — never reveal whether the account exists / is verified.
      toast.success("If that account needs verifying, a new link is on its way.")
      setResendEmail("")
    } catch {
      toast.error("Couldn't send the verification email — please try again shortly.")
    } finally {
      setResending(false)
    }
  }

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
        <img src="/logo.png" alt="GenSite" className="h-7" />
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

            {showResend && (
              <form onSubmit={handleResend} className="mt-5 pt-5 border-t border-white/10">
                <label htmlFor="resend-email" className="block text-xs text-gray-400 mb-2">
                  Didn’t get a verification email? Enter your address to resend it.
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="resend-email"
                    type="email"
                    autoComplete="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 rounded-lg bg-zinc-900/70 border border-white/10 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={resending || !resendEmail.trim()}
                    className="shrink-0 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 px-3.5 py-2 text-sm font-medium text-gray-100 transition-colors disabled:opacity-50"
                  >
                    {resending ? "Sending…" : "Resend"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mt-6">
          By continuing you agree to our{" "}
          <Link to="/terms" className="text-gray-400 hover:text-indigo-400 smooth-transition">Terms</Link> &{" "}
          <Link to="/privacy" className="text-gray-400 hover:text-indigo-400 smooth-transition">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  )
}
