import { useEffect, useState } from 'react'
import api from '@/shared/api/axios'
import { authClient } from '@/shared/api/auth-client'
import { onCreditsChanged } from './credits-bus'

// Live credit balance for the signed-in user. Returns null until loaded (or when
// signed out). Re-fetches whenever something emits a credits change, so any UI
// using it (cost hints, pre-flight checks) stays in sync after a spend/purchase.
export function useCredits(): number | null {
  const { data: session } = authClient.useSession()
  const userId = session?.user?.id
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) { setCredits(null); return }
    let cancelled = false
    const load = () =>
      api.get('/api/user/credits')
        .then(({ data }) => { if (!cancelled) setCredits(data.credits ?? null) })
        .catch(() => {})
    load()
    const off = onCreditsChanged(load)
    return () => { cancelled = true; off() }
    // Key on the stable user id, not the session object, to avoid tearing down
    // and re-subscribing (and refetching) on every render.
  }, [userId])

  return credits
}
