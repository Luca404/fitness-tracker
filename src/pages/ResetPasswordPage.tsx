import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthShell from '../components/auth/AuthShell'
import AuthNotice from '../components/auth/AuthNotice'
import PasswordField from '../components/auth/PasswordField'
import { PASSWORD_MIN_LENGTH, PASSWORD_RECOVERY_PATH, PASSWORD_RESET_MESSAGE, validateEmail } from '../utils/auth'

export default function ResetPasswordPage() {
  const { session, authError, resetPassword, updatePassword, finishPasswordRecovery } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({})
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [updated, setUpdated] = useState(false)
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const canReset = !!session && !authError
  const displayedError = error || (!canReset && !message ? authError || 'Il link è scaduto o non è più valido. Richiedi una nuova email e usa il link più recente.' : null)

  useEffect(() => {
    // Keep recovery reachable on refresh even when an older email returned to the site root.
    if (location.pathname !== PASSWORD_RECOVERY_PATH) navigate(PASSWORD_RECOVERY_PATH, { replace: true })
  }, [location.pathname, navigate])

  function leaveRecovery() {
    navigate('/', { replace: true })
    finishPasswordRecovery()
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    const errors: typeof fieldErrors = {}
    if (canReset) {
      if (password.length < PASSWORD_MIN_LENGTH) errors.password = `Usa almeno ${PASSWORD_MIN_LENGTH} caratteri per la password.`
      if (!confirmPassword || password !== confirmPassword) errors.confirmPassword = 'Le password non coincidono. Inseriscile di nuovo.'
    } else if (!validateEmail(email.trim())) {
      errors.email = 'Inserisci un indirizzo email valido, ad esempio nome@email.it.'
    }
    setFieldErrors(errors)
    setError(null)
    setMessage(null)
    if (Object.keys(errors).length) {
      formRef.current?.querySelector<HTMLInputElement>(`#${Object.keys(errors)[0]}`)?.focus()
      return
    }
    submitting.current = true
    setLoading(true)
    try {
      const result = canReset ? await updatePassword(password) : await resetPassword(email.trim())
      setError(result.error)
      if (!result.error) {
        if (canReset) {
          setUpdated(true)
          setPassword('')
          setConfirmPassword('')
        } else setMessage(PASSWORD_RESET_MESSAGE)
      }
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {updated ? <div className="space-y-5">
        <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-400/10 text-2xl text-primary-300">✓</div>
        <h1 className="text-2xl font-semibold tracking-tight">Password aggiornata.</h1>
        <p role="status" className="text-sm leading-relaxed text-gray-300">La nuova password è pronta. Usala anche per accedere alle altre app Trackrs.</p>
        <button type="button" onClick={leaveRecovery} className="btn-primary w-full rounded-xl py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">Vai a fitTrackr</button>
      </div> : <>
        <h1 className="text-2xl font-semibold tracking-tight">{canReset ? 'Scegli una nuova password.' : 'Richiedi un nuovo link.'}</h1>
        <p className="mb-6 mt-2 text-sm leading-relaxed text-gray-400">{canReset ? 'Una password unica e lunga aiuta a proteggere il tuo account.' : 'Inserisci la tua email per ricominciare il recupero della password.'}</p>
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={loading}>
          {canReset ? <>
            <PasswordField id="password" label="Nuova password" value={password} onChange={setPassword} autoComplete="new-password" error={fieldErrors.password} hint={`Almeno ${PASSWORD_MIN_LENGTH} caratteri. Preferisci una frase lunga e unica.`} disabled={loading} />
            <PasswordField id="confirmPassword" label="Conferma nuova password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" error={fieldErrors.confirmPassword} disabled={loading} />
          </> : <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-200">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" inputMode="email" spellCheck={false} required disabled={loading} value={email} onChange={event => setEmail(event.target.value)} placeholder="nome@email.it" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'email-error' : undefined} className={`input-field py-3 ${fieldErrors.email ? 'border-red-400/70' : ''}`} />
            {fieldErrors.email && <p id="email-error" className="mt-2 text-xs text-red-300">{fieldErrors.email}</p>}
          </div>}
          {displayedError && <AuthNotice message={displayedError} error />}
          {message && <AuthNotice message={message} />}
          <button type="submit" disabled={loading} className="btn-primary w-full rounded-xl py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-wait disabled:opacity-60">{loading ? 'Attendi…' : canReset ? 'Salva nuova password' : 'Invia link di recupero'}</button>
        </form>
        <button type="button" disabled={loading} onClick={leaveRecovery} className="mx-auto mt-5 block rounded text-sm text-gray-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">Torna a fitTrackr</button>
      </>}
    </AuthShell>
  )
}
