export default function AuthNotice({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <div role={error ? 'alert' : 'status'} aria-atomic="true" className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${error ? 'border-red-400/25 bg-red-400/10 text-red-200' : 'border-primary-400/25 bg-primary-400/10 text-primary-200'}`}>
      <p className="mb-1 font-semibold">{error ? 'Controlla e riprova' : 'Richiesta completata'}</p>
      {message}
    </div>
  )
}
