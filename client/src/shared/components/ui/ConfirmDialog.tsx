import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type ConfirmOptions = {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  tone?: 'danger' | 'default'
}

const ConfirmCtx = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false)

/** Promise-based confirm that renders a branded dark modal instead of window.confirm. */
export const useConfirm = () => useContext(ConfirmCtx)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; opts: ConfirmOptions }>({
    open: false,
    opts: {},
  })

  // The pending promise's resolver lives in a ref, not in state, so `close`
  // always resolves the CURRENT dialog and never a stale closure copy.
  const resolveRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        // If a previous confirm is still open, resolve it false so its awaiter
        // doesn't hang forever when a second confirm replaces it.
        resolveRef.current?.(false)
        resolveRef.current = resolve
        setState({ open: true, opts })
      }),
    []
  )

  const close = (value: boolean) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setState((s) => ({ ...s, open: false }))
  }

  const confirmBtnRef = useRef<HTMLButtonElement>(null)

  // When open: focus the confirm button, allow Escape to cancel, and restore focus
  // to whatever was focused before on close.
  useEffect(() => {
    if (!state.open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    confirmBtnRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(false) }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.open])

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state.open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          onClick={() => close(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">{state.opts.title ?? 'Are you sure?'}</h2>
            {state.opts.message && <p className="mt-2 text-sm leading-relaxed text-gray-400">{state.opts.message}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => close(false)}
                className="rounded-lg px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10"
              >
                {state.opts.cancelText ?? 'Cancel'}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition active:scale-95 ${
                  state.opts.tone === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {state.opts.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  )
}
