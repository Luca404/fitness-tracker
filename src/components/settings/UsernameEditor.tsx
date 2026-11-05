import { useEffect, useState } from 'react'
import { getFitnessUsername, setFitnessUsername, usernameError } from '../../services/fitnessLeaderboard'

export default function UsernameEditor() {
  const [saved, setSaved] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    getFitnessUsername().then(name => {
      if (active) { setSaved(name); setUsername(name); setError(null) }
    }).catch(() => {
      if (active) setError('Impossibile caricare il nome utente. Riprova.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    setError(null)
    setSuccess(false)
    const normalized = username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,24}$/.test(normalized)) {
      setError('Usa da 3 a 24 caratteri: lettere, numeri e underscore.')
      return
    }
    setSaving(true)
    try {
      const name = await setFitnessUsername(normalized)
      setSaved(name)
      setUsername(name)
      setSuccess(true)
    } catch (error) { setError(usernameError(error)) }
    finally { setSaving(false) }
  }

  return <section className="card space-y-3" aria-labelledby="username-title">
    <h2 id="username-title" className="font-semibold">Nome utente</h2>
    <p id="username-help" className="text-sm text-gray-400">Visibile agli altri utenti nella classifica, insieme ai punti totali. Da 3 a 24 caratteri: lettere, numeri e underscore.</p>
    {loading ? <p role="status" className="text-sm text-gray-400">Caricamento nome utente…</p> : saved === null ? <>
      <p role="alert" className="text-sm text-orange-300">{error}</p>
      <button type="button" className="btn-secondary min-h-11" onClick={() => { setLoading(true); setAttempt(n => n + 1) }}>Riprova</button>
    </> : <form onSubmit={event => void save(event)} className="space-y-3">
      <label htmlFor="fitness-username" className="block text-sm text-gray-300">Il tuo nome in classifica</label>
      <input id="fitness-username" className="input-field min-h-12" value={username} maxLength={24}
        autoComplete="username" autoCapitalize="none" spellCheck={false} disabled={saving}
        aria-describedby={error ? 'username-help username-error' : 'username-help'} aria-invalid={!!error}
        onChange={event => { setUsername(event.target.value); setError(null); setSuccess(false) }} />
      {error && <p id="username-error" role="alert" className="text-sm text-orange-300">{error}</p>}
      {success && <p role="status" className="text-sm text-primary-300">Nome utente aggiornato</p>}
      <button type="submit" className="btn-primary min-h-12 disabled:opacity-50" disabled={saving || username.trim().toLowerCase() === saved}>
        {saving ? 'Salvataggio…' : 'Salva nome utente'}
      </button>
    </form>}
  </section>
}
