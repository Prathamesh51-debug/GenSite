// Tiny decoupled signal so anything that spends/grants credits can tell the Navbar
// to refetch the balance, without prop-drilling or a global store. Backed by a
// window CustomEvent.

const EVENT = 'credits:changed'

/** Notify listeners (e.g. the Navbar) that the credit balance may have changed. */
export const emitCreditsChanged = (): void => {
  window.dispatchEvent(new CustomEvent(EVENT))
}

/** Subscribe to credit-change notifications. Returns an unsubscribe function. */
export const onCreditsChanged = (cb: () => void): (() => void) => {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}
