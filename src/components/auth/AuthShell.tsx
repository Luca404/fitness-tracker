import type { ReactNode } from 'react'

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate flex min-h-screen min-h-[100dvh] items-center justify-center overflow-hidden bg-gray-950 px-4 py-8 sm:px-8 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-48 -z-10 h-[36rem] w-[36rem] rounded-full bg-primary-800/20 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-32 -z-10 h-[32rem] w-[32rem] rounded-full bg-primary-900/20 blur-[100px]" />
      <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-2 lg:gap-20">
        <div className="text-center lg:text-left">
          <div className="flex items-center justify-center gap-3 lg:justify-start">
            <img src="/icon-192.png" alt="" className="h-14 w-14 rounded-2xl shadow-lg shadow-black/30" />
            <div>
              <p className="font-display text-3xl font-bold tracking-tight text-white">fit<span className="text-primary-400">Trackr</span></p>
              <p className="mt-1 text-xs tracking-wide text-gray-400">Il tuo diario, il tuo ritmo.</p>
            </div>
          </div>
          <div className="mt-10 hidden lg:block">
            <p className="font-display text-5xl font-semibold leading-tight tracking-tight text-white">Piccole abitudini.<br /><span className="text-primary-300">Grandi progressi.</span></p>
            <p className="mt-5 max-w-sm text-base leading-relaxed text-gray-400">Pasti, allenamenti e peso in un unico spazio. Prenditi cura di te, un giorno alla volta.</p>
            <div className="mt-9 flex flex-wrap gap-2 text-sm text-gray-300">
              {['Pasti e nutrizione', 'Allenamenti', 'I tuoi progressi'].map(label => (
                <span key={label} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2">{label}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-white/10 bg-gray-900/90 p-6 shadow-2xl shadow-black/25 sm:p-8">{children}</div>
          <p className="mt-5 text-center text-xs leading-relaxed text-gray-500">Un solo account per le app Trackrs.</p>
        </div>
      </div>
    </main>
  )
}
