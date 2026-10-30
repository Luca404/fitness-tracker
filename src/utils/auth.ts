export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_RECOVERY_PATH = '/reset-password'

export const SIGN_UP_MESSAGE = 'Se l’indirizzo è disponibile, riceverai un’email per confermare l’account. Se hai già un account, accedi o recupera la password.'
export const PASSWORD_RESET_MESSAGE = 'Se esiste un account associato a questa email, riceverai un link per reimpostare la password. Controlla anche la cartella spam.'

type AuthAction = 'signIn' | 'signUp' | 'resetPassword' | 'updatePassword' | 'google'

function errorDetails(error: unknown) {
  if (!error || typeof error !== 'object') return { code: '', message: '', status: 0 }
  const details = error as { code?: string; message?: string; status?: number }
  return { code: details.code ?? '', message: details.message ?? '', status: details.status ?? 0 }
}

export function isExistingAccountError(error: unknown) {
  const { code, message } = errorDetails(error)
  return ['user_already_exists', 'email_exists'].includes(code)
    || /user already registered|email already (?:exists|registered)/i.test(message)
}

export function getAuthErrorMessage(error: unknown, action: AuthAction): string {
  const { code, message, status } = errorDetails(error)
  if (status === 429 || ['over_request_rate_limit', 'over_email_send_rate_limit'].includes(code)) {
    return 'Troppi tentativi in poco tempo. Attendi qualche minuto prima di riprovare.'
  }
  if (error instanceof TypeError || /fetch|network|load failed/i.test(message)) {
    return 'Non riusciamo a collegarci. Controlla la connessione e riprova.'
  }
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Email o password non corrette. Controlla i dati oppure recupera la password.'
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return 'Conferma il tuo indirizzo email prima di accedere: cerca il messaggio di conferma anche nello spam.'
  }
  if (code === 'email_address_invalid') return 'Inserisci un indirizzo email valido.'
  if (code === 'weak_password' || /password should be at least/i.test(message)) {
    const length = message.match(/at least (\d+) characters/i)?.[1]
    return length
      ? `La password deve contenere almeno ${length} caratteri.`
      : 'Questa password è troppo debole. Scegli una password più lunga e difficile da indovinare.'
  }
  if (code === 'same_password') return 'Scegli una password diversa da quella attuale.'
  if (['otp_expired', 'session_not_found', 'session_expired', 'refresh_token_not_found'].includes(code)) {
    return 'Il link è scaduto o non è più valido. Richiedi una nuova email per reimpostare la password.'
  }
  if (code === 'reauthentication_needed') {
    return 'Per sicurezza, richiedi un nuovo link di recupero e riprova dalla nuova email.'
  }
  if (code === 'signup_disabled' || code === 'email_provider_disabled') {
    return 'La registrazione tramite email non è disponibile al momento. Riprova più tardi.'
  }
  if (code === 'email_address_not_authorized') {
    return 'Il servizio email non è ancora disponibile per questo indirizzo. Riprova più tardi.'
  }
  if (action === 'google') return 'Non è stato possibile accedere con Google. Riprova oppure usa email e password.'
  if (action === 'resetPassword') return 'Non è stato possibile inviare l’email di recupero. Riprova tra poco.'
  if (action === 'updatePassword') return 'Non è stato possibile aggiornare la password. Riprova o richiedi un nuovo link.'
  if (action === 'signUp') return 'Non è stato possibile completare la richiesta di registrazione. Riprova tra poco.'
  return 'Non è stato possibile accedere. Riprova tra poco.'
}

export function readAuthCallback(url: URL) {
  const hash = new URLSearchParams(url.hash.slice(1))
  const get = (key: string) => hash.get(key) ?? url.searchParams.get(key)
  const recovery = url.pathname === PASSWORD_RECOVERY_PATH || get('type') === 'recovery'
  const hasError = get('error') || get('error_code') || get('error_description')
  const error = !hasError ? null : recovery || get('error_code') === 'otp_expired'
    ? 'Il link è scaduto o non è più valido. Richiedi una nuova email e usa il link più recente.'
    : get('error') === 'access_denied'
      ? 'Accesso annullato o non autorizzato. Puoi riprovare oppure usare email e password.'
      : 'Non è stato possibile completare l’accesso dal link. Riprova o richiedi una nuova email.'
  return { recovery, error }
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
