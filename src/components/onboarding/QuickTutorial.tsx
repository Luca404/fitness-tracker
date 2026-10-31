import { useEffect, useRef, useState } from 'react'

const STEPS = [
  {
    section: 'Cucina · Ingredienti',
    title: 'Parti dagli ingredienti',
    description: 'Aggiungi gli alimenti che usi: li ritroverai quando componi un piatto o registri un pasto.',
    points: [
      ['Codice a barre', 'Scansiona la confezione per cercare il prodotto.'],
      ['Foto dell’etichetta', 'L’AI legge i valori nutrizionali: controllali prima di salvare.'],
      ['Inserimento manuale', 'Scrivi nome e valori se preferisci aggiungerli a mano.'],
    ],
    takeaway: 'Gli ingredienti salvati sono il tuo catalogo personale, sempre riutilizzabile.',
    path: 'M4 4v16M7 4v16M11 4v16M14 4v16M16 4v16M20 4v16',
  },
  {
    section: 'Cucina · Piatti',
    title: 'Un piatto, più porzioni',
    description: 'Combina ingredienti e quantità in un piatto salvato, così non devi ricomporlo ogni volta.',
    points: [
      ['Salva la ricetta', 'Crea i tuoi piatti abituali nella scheda Piatti.'],
      ['Prepara e conserva', 'Da Pasti, scegli un piatto e usa “Prepara e conserva il resto”: mangiane una parte o tienilo tutto per dopo.'],
      ['Riprendi il resto', 'Le porzioni rimaste restano tra i piatti pronti, disponibili per i pasti successivi.'],
    ],
    takeaway: 'Preparare non significa consumare: nel diario entra solo la porzione che mangi.',
    path: 'M4 9h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9ZM2 9h20M8 5h8M10 2h4',
  },
  {
    section: 'Pasti · Aggiungi pasto',
    title: 'Registra ciò che mangi',
    description: 'Scegli il giorno e il pasto, poi inserisci le quantità effettivamente consumate.',
    points: [
      ['Da ingredienti', 'Aggiungi un singolo alimento oppure componi un nuovo piatto.'],
      ['Dalla tua cucina', 'Scegli un piatto salvato o una porzione di un piatto già preparato.'],
      ['Da foto', 'Non conosci gli ingredienti? Fai analizzare il pasto dall’AI e controlla la stima e la porzione mangiata.'],
    ],
    takeaway: 'La foto dell’etichetta salva un ingrediente; la foto del pasto stima ciò che hai mangiato.',
    path: 'M4 3v5a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 2-3 5-3 8h5M19 3v18',
  },
  {
    section: 'Peso',
    title: 'Segui il peso nel tempo',
    description: 'Aggiungi una pesata con la sua data per costruire il tuo andamento personale.',
    points: [
      ['Registra una misura', 'Apri Peso e inserisci il valore in kg per il giorno scelto.'],
      ['Guarda l’andamento', 'Ritrova le misurazioni nel grafico e nello storico del peso.'],
    ],
    takeaway: 'Dalle Impostazioni puoi anche aggiornare i dati del profilo e gli obiettivi.',
    path: 'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM7 9a6 6 0 0 1 10 0M12 7v6',
  },
  {
    section: 'Fitness · Allenamenti',
    title: 'Dalla scheda all’allenamento',
    description: 'Organizza la palestra e i pesi con le tue schede, poi registra le sessioni che svolgi.',
    points: [
      ['Nuova scheda', 'Aggiungi esercizi, serie e ripetizioni per preparare il tuo allenamento.'],
      ['Avvia la sessione', 'Segna carichi, ripetizioni e serie completate; ritrovi l’andamento in Progressi.'],
      ['Altre attività', 'Registra anche camminate, corsa, bici e altro, con durata e distanza quando prevista.'],
    ],
    takeaway: 'Una scheda è il programma da riutilizzare; una sessione è l’allenamento svolto.',
    path: 'M6 5v14M3 8v8M6 12h12M18 5v14M21 8v8',
  },
  {
    section: 'Pasti · Buone abitudini',
    title: 'Non solo calorie',
    description: 'Il riepilogo Buone abitudini nella pagina Pasti ti aiuta a seguire anche il benessere alimentare.',
    points: [
      ['Apri il riepilogo', 'Tocca i quadratini per vedere verdura, frutta, legumi, pesce, fibre, zuccheri, alcol e sale.'],
      ['Leggi il dettaglio', 'Trovi quantità e obiettivi: legumi e pesce sono valutati sugli ultimi sette giorni.'],
      ['Controlla i dati', 'Un trattino indica dati incompleti: alcuni valori nutrizionali potrebbero mancare.'],
    ],
    takeaway: 'Puoi tornare a questa guida quando vuoi: Impostazioni → Rivedi il tutorial.',
    path: 'M20 4c-9-1-15 2-15 8a6 6 0 0 0 6 6c6 0 9-6 9-14ZM3 21 15 9',
  },
] as const

export default function QuickTutorial({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    if (contentRef.current) contentRef.current.scrollTop = 0
  }, [step])

  return (
    <div className="flex h-dvh flex-col bg-gray-900 text-white">
      <header className="mx-auto flex w-full max-w-2xl shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
        <span className="font-display text-xl font-bold text-primary-400">fitTrackr</span>
        <button type="button" onClick={onFinish}
          className="min-h-12 rounded-xl px-4 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400">
          Salta tutorial
        </button>
      </header>

      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-5 py-5 sm:px-8 sm:py-8">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary-500/25 bg-primary-500/10 text-primary-300" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={current.path} />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-400">Guida rapida · {step + 1} di {STEPS.length}</p>
              <p className="mt-1 text-sm text-gray-400">{current.section}</p>
            </div>
          </div>

          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold leading-tight tracking-tight outline-none sm:text-4xl">
            {current.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-300 sm:text-base">{current.description}</p>

          <dl className="my-6 space-y-4">
            {current.points.map(([title, description]) => (
              <div key={title} className="border-l-2 border-gray-700 pl-4">
                <dt className="text-sm font-semibold text-gray-100">{title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-gray-400">{description}</dd>
              </div>
            ))}
          </dl>

          <p className="rounded-2xl border border-primary-500/20 bg-primary-500/5 p-4 text-sm leading-relaxed text-primary-200">
            {current.takeaway}
          </p>
        </main>
      </div>

      <footer className="mx-auto w-full max-w-lg shrink-0 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
        <nav aria-label="Tappe del tutorial">
          <ol className="flex justify-center">
            {STEPS.map((item, index) => (
              <li key={item.title}>
                <button type="button" onClick={() => setStep(index)}
                  aria-label={`Tappa ${index + 1}: ${item.title}`}
                  aria-current={index === step ? 'step' : undefined}
                  className="flex h-12 w-12 items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400">
                  <span aria-hidden="true" className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${index === step ? 'w-6 bg-primary-400' : 'w-2 bg-gray-600'}`} />
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary min-h-12 flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400">
              Indietro
            </button>
          )}
          <button type="button" onClick={() => isLast ? onFinish() : setStep(step + 1)}
            className="btn-primary min-h-12 flex-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400">
            {isLast ? 'Inizia a usare fitTrackr' : 'Avanti'}
          </button>
        </div>
      </footer>
    </div>
  )
}
