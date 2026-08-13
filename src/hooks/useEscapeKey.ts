import { useEffect } from 'react'

/** Closes a modal/dialog/drawer on Escape — standard #22/#31 expect this on every overlay. */
export function useEscapeKey(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active, onClose])
}
