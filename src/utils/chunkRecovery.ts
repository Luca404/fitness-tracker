/** Recover one failed page import per build, without a reload loop offline. */
export function installChunkRecovery(buildId: string, reload = () => window.location.reload()) {
  const key = `fittrackr:chunk-recovery:${buildId}`
  function recover() {
    if (!navigator.onLine) return
    try {
      if (sessionStorage.getItem(key)) return
      // Keep a single marker across deployments rather than accumulating keys.
      for (const previous of Object.keys(sessionStorage)) {
        if (previous.startsWith('fittrackr:chunk-recovery:')) sessionStorage.removeItem(previous)
      }
      sessionStorage.setItem(key, '1')
    } catch {
      // Without durable session storage an automatic reload could repeat.
      return
    }
    reload()
  }
  window.addEventListener('vite:preloadError', recover)
  return () => window.removeEventListener('vite:preloadError', recover)
}
