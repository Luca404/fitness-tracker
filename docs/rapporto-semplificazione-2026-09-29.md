# Rapporto di analisi e semplificazione di fitTrackr

Prima analisi: 29 settembre 2026. Revisione e implementazione: 4 ottobre 2026.
Ambito: frontend, servizi, PWA, test e documentazione. Il database condiviso non
è stato modificato; questa revisione non aggiunge migrazioni.

## Cambiamenti rispetto alla prima analisi

Sono stati aggiunti peso cotto e preferenze di cottura, catalogo nutrizionale
esteso, flusso palestra, formattazione dei numeri e calorie palestra nella
panoramica. Il catalogo ingredienti non gestisce più scorte: la proposta sulle
funzioni SQL di consumo/ripristino della dispensa è superata. Restano atomiche
nel database le porzioni dei piatti preparati.

La revisione comprende due problemi segnalati durante il lavoro: blocco con
solo sfondo blu nell’app installata sul telefono e icone dei piatti incoerenti
nella pagina Pasti.

## Interventi sui 14 punti originali

| Punto | Riscontro prima dell’intervento | Esito della revisione |
| --- | --- | --- |
| 1. Dati associati alla data | Vecchi dati visibili durante il cambio data; scritture tardive applicate al giorno aperto | **Implementato.** `useDiary` conserva un giorno unico, svuota la vista quando cambia data e scarta letture superate. Le scritture aggiornano soltanto il giorno e l’utente di origine; se una lettura precede una scrittura, ricarica il risultato salvato. |
| 2. Zuccheri | Il limite per zuccheri liberi era confrontato con zuccheri totali | **Implementato.** Zuccheri totali informativi, senza target né giudizio; esclusi dal punteggio delle abitudini. Dati mancanti restano sconosciuti. |
| 3. Refresh abitudini | Chiave basata sul numero di ingredienti | **Implementato.** Revisione delle scritture, cache settimanale condivisa con durata di 60 secondi e invalidazione dopo modifica, aggiunta, eliminazione o refresh del diario. |
| 4. Copia `Meal.items` | Ingredienti mantenuti sia nel pasto sia nelle entries | **Implementato.** Unica fonte `entries[].items`; appiattimento con `mealItems` nei consumatori. |
| 5. Scala nutrizionale | Logica ripetuta in editor e bevande | **Implementato.** `scaleNutrition` e `scaleIngredient` condivisi. Conservati nutrienti sconosciuti, metadati e precisione di calcolo a due decimali; visualizzazione a un decimale, panoramiche intere. |
| 6. PantryPage | 916 righe; form, conversione e revisione mescolati | **Implementato.** `PantryReview`, `PantryNutritionFields` e `pantryDraft`; stato del flusso con revisione e ID di modifica associati. Reset testato per evitare di modificare il prodotto precedente. |
| 7. Piatti duplicati | Conversioni/totali ripetuti e ramo suggeriti irraggiungibile | **Implementato.** Funzioni pure in `utils/dishes`; rimosso il ramo suggeriti. Totali distinguono grammi e millilitri. |
| 8. DataContext | Diario e profilo mescolati; ricalcolo peso duplicato; “oggi” fisso | **Implementato.** Diario estratto in `useDiary`, letture peso e ricalcolo in `goalRefresh`. “Oggi” aggiornato a mezzanotte e alla ripresa dell’app, preservando la data scelta. Correzioni di peso aggiornano anche la stima palestra. |
| 9. Hydration API | Filtri annidati e ricerca legacy ripetuta | **Implementato per i dati correnti.** Raggruppamento per ID per pasti, piatti, schede e sessioni; catalogo indicizzato per nome. Letture settimanali senza query delle icone. Tipi generati dal database rinviati, come descritto sotto. |
| 10. SQL | Proposta scorte non più aderente al modello corrente | **Superato nella forma originaria.** Mantenuti RPC atomici e propagazione nutrizionale attuali. Nessuna riscrittura di migrazioni applicate. |
| 11. Scanner e foto | Caricati insieme alla pagina Ingredienti | **Implementato.** Import dinamici dei componenti e del decoder ZXing per le foto; decoder separato dal modulo della pagina. |
| 12. File inattivi | Asset starter e lookup barcode duplicato | **Implementato.** Rimosse risorse senza riferimenti, `suggestedDishes`, `lookupBarcode` e dipendenza diretta `react-is`; quest’ultima resta una dipendenza peer di Recharts. |
| 13. Test e CI | Test presenti, CI assente | **Implementato.** Nuovi scenari di concorrenza, cache, refresh, icone, errori di pagina, aggiornamenti PWA e ripresa dell’app. Workflow GitHub Actions con test, build e lint; credenziali fittizie locali per i controlli. |
| 14. Documentazione | Documenti locali già aggiornati in parte | **Implementato.** Report e README allineati all’architettura e alle verifiche; conservate le modifiche locali precedenti. |

## Blocco con sfondo blu nell’app installata

Il repository non aveva una barriera per gli errori di rendering o degli import
dinamici. In caso di errore, l’interfaccia poteva sparire lasciando il colore di
sfondo. Inoltre la PWA usava aggiornamenti automatici senza un flusso applicativo
di ricaricamento. Questi sono problemi concreti del codice; la causa specifica
segnalata sul telefono non è stata riprodotta e rimane da confermare.

Interventi applicati:

- Barriera globale e barriera per pagina: messaggio leggibile e pulsante di
  ricaricamento. Il menu rimane disponibile dopo un errore nella pagina.
- Barriera della pagina reinizializzata al cambio percorso, così è possibile
  aprire un’altra sezione dopo un errore. Stato di caricamento visibile durante
  gli import. Dopo 15 secondi di attesa compare anche il pulsante di
  ricaricamento, compreso il caricamento iniziale del profilo.
- Gestione `vite:preloadError`: un tentativo automatico di ricaricamento per build
  e sessione, con protezione dai cicli; nessun tentativo automatico offline o
  quando la memoria di sessione è bloccata.
- PWA con avviso **Aggiorna / Più tardi**: il nuovo worker attende l’azione
  dell’utente e applica l’aggiornamento con ricaricamento.
- Header `no-cache` per HTML, percorsi dell’app e service worker su Vercel.

Vite documenta il caso in cui un’app aperta tenta di importare file con hash
precedenti dopo una pubblicazione e consiglia HTML con controllo della cache:
[Load error handling](https://vite.dev/guide/build.html#load-error-handling).
Il comportamento degli aggiornamenti automatici del worker è descritto in
[Automatic reload](https://vite-pwa-org.netlify.app/guide/auto-update.html).

I test simulano errori di rendering e import rifiutati, controllano che il menu
resti utilizzabile e che la navigazione verso un’altra pagina recuperi la vista.
Coprono anche import che non terminano e aggiornamenti rinviati, applicati o falliti e la protezione dai
ricaricamenti ripetuti. Non sostituiscono una prova sul telefono con due versioni
pubblicate: quella verifica resta necessaria per confermare il problema originale.

## Icone dei piatti nei Pasti

Sono stati corretti due percorsi:

1. Cambiare l’icona in Cucina aggiornava il ricettario, ma non il diario già
   caricato. Ora aggiorna anche lo stato condiviso.
2. Le porzioni preparate leggevano l’icona della copia della ricetta creata alla
   preparazione. Ora risolvono l’icona attuale del piatto originale, anche per
   preparazioni già chiuse. Nutrizione e quantità della porzione restano quelle
   dello snapshot. Se il piatto originale è stato eliminato, resta l’icona della
   copia; rimuovere un’icona personalizzata ripristina invece il comportamento
   automatico.

Il collegamento all’icona originale è conservato anche dopo la modifica di una
entry. Sono coperti lettura del diario, elenco preparazioni, icona rimossa,
originale eliminato e modifica dell’icona nello stato condiviso.

## Abitudini e aggiornamenti del diario

Gli zuccheri totali del catalogo comprendono anche quelli naturalmente presenti
negli alimenti e non permettono di ricavare gli zuccheri liberi. La distinzione è
coerente con la [definizione OMS](https://www.who.int/news/item/04-03-2015-who-calls-on-countries-to-reduce-sugars-intake-among-adults-and-children).
Il valore totale rimane visibile e viene escluso dal giudizio sulle abitudini.

Il diario è caricato centralmente per data, evitando richieste identiche a ogni
cambio pagina. Correggere un ingrediente, modificare/eliminare un piatto o
concludere/eliminare una sessione palestra provoca un refresh esplicito. Le
modifiche nutrizionali invalidano anche la cache delle abitudini settimanali,
indipendentemente dal numero di ingredienti.

## Confini delle modifiche al database e lavori successivi

Questa revisione mantiene il comportamento attuale: correggere un ingrediente
aggiorna anche i pasti collegati del passato. Congelare lo storico richiede una
decisione di prodotto. Non serve una migrazione per le modifiche implementate.

Restano interventi separati:

- Generare tipi Supabase dallo schema effettivo e verificare le risposte RPC
  senza cast manuali. Il progetto ospitato è condiviso: l’eventuale generazione
  deve essere limitata alle tabelle e funzioni di fitTrackr.
- Verificare su Supabase locale gli RPC, la concorrenza sulle porzioni e i vincoli
  di accesso. In questa sessione non è stato avviato un database locale.
- Rimuovere il fallback degli alimenti legacy soltanto dopo aver verificato e
  migrato i record esistenti.
- Confermare sul telefono la navigazione tra pagine, la ripresa dopo sospensione
  e l’aggiornamento fra due versioni pubblicate.

Non riscrivere le migrazioni applicate e non resettare il database collegato
condiviso.

Verifica del database ospitato del 4 ottobre 2026: `supabase db push --dry-run`
e `supabase db push` completati con esito “Remote database is up to date”.
Non risultano migrazioni pendenti; nessuna migrazione è stata applicata.

## Verifica finale

- `npm test -- --run`: **194 test superati in 44 file**, rispetto ai 166 della baseline.
- `npm run build`: TypeScript e build Vite/PWA superati.
- `npm run lint`: superato, senza errori o avvisi.
- `git diff --check`: superato.
- La suite è stata verificata anche con URL e chiave Supabase fittizi locali,
  come nel workflow CI; nessun test richiede il database ospitato.

| Artefatto | Prima | Dopo |
| --- | ---: | ---: |
| Modulo PantryPage | 473,53 kB | 28,53 kB |
| Modulo PantryPage gzip | 124,50 kB | 7,04 kB |
| Decoder ZXing separato | Incluso in PantryPage | 412,38 kB / 110,05 kB gzip |
| Grafici Recharts | 336,56 kB / 99,29 kB gzip | 336,56 kB / 99,29 kB gzip |
| Precache PWA complessivo | 1.536,10 KiB | 1.552,25 KiB |
| Righe PantryPage | 916 | 539 |
| Righe DataContext | 365 | 219, più il diario estratto |

Il modulo della pagina Ingredienti si riduce di circa il 94%; il decoder viene
caricato come modulo soltanto quando serve. Il service worker continua a
precaricare gli artefatti, quindi questa separazione riduce il codice da
analizzare/eseguire all’apertura della pagina e non elimina il download del
decoder durante l’installazione PWA. Il precache totale cresce di 16,15 KiB con
le funzioni di recupero e aggiornamento. Non sono state misurate latenze reali
su telefono e non si attribuisce questa riduzione all’intera applicazione.
