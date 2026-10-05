import { useEffect, useRef, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { AuthView } from "@daveyplate/better-auth-ui"
import { toast } from "sonner"
import AuthBot, { type BotMode } from '@/features/auth/components/AuthBot'
import AuthUIScope from '@/features/auth/components/AuthUIScope'
import { authClient } from "@/shared/api/auth-client"

const copyMap: Record<string, { h: string; s: string }> = {
  "sign-in": { h: "Welcome back", s: "Let’s pick up right where you left off." },
  "sign-up": { h: "Let’s build something", s: "Make an account and start from a sentence." },
  "forgot-password": { h: "Reset your password", s: "We’ll email you a link to get back in." },
  "reset-password": { h: "Set a new password", s: "Choose something strong and easy to remember." },
}

function AuthPageContent() {
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
    <main className="relative min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 overflow-hidden text-foreground">
      {}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[38rem] h-[38rem] rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[26rem] h-[26rem] rounded-full bg-clay/10 blur-[120px]" />
      </div>

      <Link to="/" className="flex items-center gap-2.5 mb-8 animate-fade-in-down hover:scale-105 smooth-transition">
        <span className="size-4 rounded-full bg-primary" />
        <span className="font-display text-xl font-extrabold tracking-tight text-primary">GenSite</span>
      </Link>

      <div className="w-full max-w-md animate-fade-in-up">
        <div className="flex justify-center -mb-5 relative z-10 pointer-events-none">
          <AuthBot mode={botMode} />
        </div>
        <div className="rounded-organic ink-border shadow-sticker bg-card">
          <div ref={cardRef} className="rounded-organic p-7 sm:p-8">
            <div className="text-center mb-6">
              <h1 className="font-display text-[28px] md:text-[32px] font-bold tracking-tight text-foreground">{copy.h}</h1>
              <p className="text-muted-foreground text-[15px] mt-2">{copy.s}</p>
            </div>
            <AuthView pathname={pathname} classNames={{ base: "bg-transparent border-0 shadow-none" }} />

            {showResend && (
              <form onSubmit={handleResend} className="mt-5 pt-5 border-t border-border">
                <label htmlFor="resend-email" className="block text-xs text-muted-foreground mb-2">
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
                    className="flex-1 rounded-lg bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={resending || !resendEmail.trim()}
                    className="shrink-0 rounded-lg bg-card hover:border-primary/50 border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors disabled:opacity-50"
                  >
                    {resending ? "Sending…" : "Resend"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing you agree to our{" "}
          <Link to="/terms" className="text-muted-foreground hover:text-primary smooth-transition">Terms</Link> &{" "}
          <Link to="/privacy" className="text-muted-foreground hover:text-primary smooth-transition">Privacy Policy</Link>.
        </p>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <AuthUIScope>
      <AuthPageContent />
    </AuthUIScope>
  )
}
