import { Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'
import api from '@/shared/api/axios'

const MAX_WAIT_MS = 45000
const POLL_MS = 2500

// Stripe redirects here after checkout. Instead of a blind timed redirect, poll
// the credit balance until the webhook has granted the purchase (Render cold
// starts can delay that by 30–60s), then redirect with confirmation. Falls back
// to a friendly "still processing" message after a cap so the user is never stuck.
const Loading = () => {
  const [msg, setMsg] = useState('Confirming your payment…')

  useEffect(() => {
    // Baseline captured before checkout. If it's missing (direct hit / cleared
    // storage), seed it from the first successful read so a webhook that grants
    // credits AFTER we land is still detected — instead of always waiting to the cap.
    let baseline = Number(localStorage.getItem('creditsBefore') ?? 'NaN')
    const started = Date.now()
    let timer: number | undefined
    let cancelled = false

    const finish = () => {
      localStorage.removeItem('creditsBefore')
      window.dispatchEvent(new CustomEvent('credits:changed'))
      window.location.href = '/'
    }

    const poll = async () => {
      if (cancelled) return
      try {
        const { data } = await api.get('/api/user/credits')
        if (typeof data.credits === 'number') {
          if (Number.isNaN(baseline)) {
            baseline = data.credits // no prior baseline — seed from the first read
          } else if (data.credits > baseline) {
            setMsg('Credits added! Redirecting…')
            return finish()
          }
        }
      } catch {
        // Backend may be cold-starting — keep waiting until the cap.
      }
      if (Date.now() - started > MAX_WAIT_MS) {
        setMsg('Still processing — your credits will appear shortly.')
        return finish()
      }
      timer = window.setTimeout(poll, POLL_MS)
    }

    poll()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  }, [])

  return (
    <div className='h-screen flex flex-col'>
      <div className='flex flex-col items-center justify-center gap-3 flex-1' role='status' aria-label='Loading'>
        <Loader2Icon className='size-7 animate-spin text-indigo-200' />
        <p className='text-sm text-gray-400'>{msg}</p>
      </div>
    </div>
  )
}

export default Loading
