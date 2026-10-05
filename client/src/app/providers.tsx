import { AuthUIProvider } from "@daveyplate/better-auth-ui"
import { authClient } from "@/shared/api/auth-client"
import { useNavigate, NavLink } from "react-router-dom"

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  return (
      <AuthUIProvider
        authClient={authClient}
        navigate={navigate}
        Link={(props)=> <NavLink {...props} to={props.href}/>}
        captcha={turnstileSiteKey ? { provider: "cloudflare-turnstile", siteKey: turnstileSiteKey, endpoints: ["/sign-up/email"] } : undefined}
      >
          {children}
      </AuthUIProvider>
    )
}