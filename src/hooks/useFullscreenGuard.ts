import { useCallback, useEffect, useState } from 'react'

// Escape exiting fullscreen is enforced by the browser and cannot be
// intercepted or blocked from JS — this hook only detects the exit (via
// `fullscreenchange`) so the caller can react to it, e.g. re-prompt the user.
export function useFullscreenGuard() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const requestFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
    } catch {
      // Rejected or unsupported (e.g. iframe without allow="fullscreen",
      // partial Safari support) — fail silently, don't block test-taking.
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return
    try {
      await document.exitFullscreen()
    } catch {
      // Already exited or unsupported — nothing to do.
    }
  }, [])

  return { isFullscreen, requestFullscreen, exitFullscreen }
}
