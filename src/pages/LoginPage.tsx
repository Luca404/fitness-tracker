import { useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AuthShell from '../components/auth/AuthShell'
import AuthNotice from '../components/auth/AuthNotice'
import PasswordField from '../components/auth/PasswordField'
import { PASSWORD_MIN_LENGTH, PASSWORD_RESET_MESSAGE, SIGN_UP_MESSAGE, validateEmail } from '../utils/auth'

type Mode = 'login' | 'signup' | 'forgot'
type FieldErrors = { email?: string; password?: string; confirmPassword?: string }

export default function LoginPage() {
  const { signIn, signUp, resetPassword, signInWithGoogle, googleEnabled, authError, clearAuthError } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const isLogin = mode === 'login'
  const isSignup = mode === 'signup'
  const isForgot = mode === 'forgot'

  function changeMode(nextMode: Mode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setFieldErrors({})
    setError(null)
    setMessage(null)
    clearAuthError()
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    const errors: FieldErrors = {}
    if (!validateEmail(email.trim())) errors.email = 'Inserisci un indirizzo email valido, ad esempio nome@email.it.'
    if (!isForgot && !password) errors.password = 'Inserisci la password.'
    else if (isSignup && password.length < PASSWORD_MIN_LENGTH) errors.password = `Usa almeno ${PASSWORD_MIN_LENGTH} caratteri per la password.`
    if (isSignup && (!confirmPassword || password !== confirmPassword)) errors.confirmPassword = 'Le password non coincidono. Inseriscile di nuovo.'
    setFieldErrors(errors)
    setError(null)
    setMessage(null)
    clearAuthError()
    if (Object.keys(errors).length) {
      formRef.current?.querySelector<HTMLInputElement>(`#${Object.keys(errors)[0]}`)?.focus()
      return
    }
    submitting.current = true
    setLoading(true)
    try {
      const result = isForgot ? await resetPassword(email.trim()) : await (isLogin ? signIn : signUp)(email.trim(), password)
      setError(result.error)
      if (!result.error && !isLogin) {
        setMessage(isForgot ? PASSWORD_RESET_MESSAGE : SIGN_UP_MESSAGE)
        setPassword('')
        setConfirmPassword('')
      }
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  async function handleGoogle() {
    if (submitting.current) return
    submitting.current = true
    setLoading(true)
    setError(null)
    setMessage(null)
    clearAuthError()
    try {
      const result = await signInWithGoogle()
      setError(result.error)
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {!isForgot && <div className="mb-7 flex rounded-xl bg-gray-950/70 p-1" aria-label="Accesso o registrazione">
        {([['login', 'Accedi'], ['signup', 'Registrati']] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={mode === value} disabled={loading} onClick={() => changeMode(value)} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${mode === value ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}>{label}</button>
        ))}
      </div>}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{isForgot ? 'Password dimenticata?' : isLogin ? 'Bentornato.' : 'Inizia da qui.'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">{isForgot ? 'Inserisci la tua email: ti invieremo un link per scegliere una nuova password.' : isLogin ? 'Accedi e riprendi il tuo percorso.' : 'Crea il tuo account e fai spazio alle buone abitudini.'}</p>
      </div>

      {googleEnabled && !isForgot && <>
        <button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-medium transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:cursor-wait disabled:opacity-50">
          <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.9h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15.1Z" /><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20.4 20.4 0 0 0 24 44Z" /><path fill="#FBBC05" d="M12.6 27.5a12.2 12.2 0 0 1 0-7.8v-5.3H5.8a20.4 20.4 0 0 0 0 18.4l6.8-5.3Z" /><path fill="#EA4335" d="M24 11.3c3 0 5.6 1 7.7 3l5.8-5.8A19.4 19.4 0 0 0 24 3.6 20.4 20.4 0 0 0 5.8 14.4l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z" /></svg>
          Continua con Google
        </button>
        <div className="my-5 flex items-center gap-3 text-xs text-gray-500"><span className="h-px flex-1 bg-gray-700" />oppure con email<span className="h-px flex-1 bg-gray-700" /></div>
      </>}

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={loading}>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-200">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="nome@email.it" value={email} onChange={event => setEmail(event.target.value)} required disabled={loading} aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'email-error' : undefined} className={`input-field py-3 ${fieldErrors.email ? 'border-red-400/70' : ''}`} />
          {fieldErrors.email && <p id="email-error" className="mt-2 text-xs text-red-300">{fieldErrors.email}</p>}
        </div>
        {!isForgot && <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete={isLogin ? 'current-password' : 'new-password'} error={fieldErrors.password} disabled={loading} hint={isSignup ? `Almeno ${PASSWORD_MIN_LENGTH} caratteri. Preferisci una frase lunga e unica.` : undefined} />}
        {isSignup && <PasswordField id="confirmPassword" label="Conferma password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" error={fieldErrors.confirmPassword} disabled={loading} />}
        {isLogin && <div className="text-right"><button type="button" disabled={loading} onClick={() => changeMode('forgot')} className="rounded text-sm font-medium text-primary-300 hover:text-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">Password dimenticata?</button></div>}
        {(error || authError) && <AuthNotice message={(error || authError)!} error />}
        {message && <AuthNotice message={message} />}
        <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-wait disabled:opacity-60">
          {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />}
          {loading ? 'Attendi…' : isForgot ? 'Invia link di recupero' : isLogin ? 'Accedi' : 'Crea account'}
        </button>
      </form>

      {isSignup && <p className="mt-5 text-xs leading-relaxed text-gray-400">Hai già usato un’altra app Trackrs? Puoi accedere con la stessa email e password.</p>}
      {(isForgot || (isSignup && message)) && <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-3 text-sm">
        <button type="button" disabled={loading} onClick={() => changeMode('login')} className="rounded text-gray-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">Torna ad accedere</button>
        {isSignup && <button type="button" disabled={loading} onClick={() => changeMode('forgot')} className="rounded text-primary-300 hover:text-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400">Recupera password</button>}
      </div>}
    </AuthShell>
  )
}
