# Rapporto di analisi e semplificazione di fitTrackr

Prima analisi: 29 settembre 2026. Revisione e implementazione: 4 ottobre 2026.
Ambito: frontend, servizi, PWA, test e documentazione. Il refactoring iniziale
non richiedeva migrazioni. Gli interventi successivi su gradazione alcolica,
ordine degli ingredienti e schede palestra includono tre migrazioni applicate
al database condiviso, descritte sotto.

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
| 2. Zuccheri | Il limite per zuccheri liberi era confrontato con zuccheri totali | **Aggiornato su richiesta.** Zuccheri totali inclusi nel punteggio delle abitudini con il riferimento LARN del 15% del target calorico, convertito in grammi. Nessuna distinzione richiesta tra zuccheri liberi e aggiunti; dati mancanti restano sconosciuti. |
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

Revisione del 4 ottobre: ripristinati gli **zuccheri totali** nel giudizio delle
abitudini, correggendo il precedente riferimento agli zuccheri liberi. Il
[riferimento LARN per gli zuccheri totali](https://sinu.it/2019/07/09/carboidrati-e-fibra-alimentare/)
comprende anche gli zuccheri naturalmente presenti in latte e frutta. L’app usa
il 15% del target calorico, convertito in grammi; non richiede una distinzione
fra zuccheri liberi e aggiunti.

Aggiunto il totale giornaliero in **unità alcoliche** (1 UA = 12 g di etanolo),
calcolato da ml e gradazione. Le soglie orientative seguono ISS/PASSI e il
profilo: 2 UA uomini adulti, 1 UA donne e persone da 65 anni, zero minorenni.
Le soglie sono riferimenti orientativi. I dati sconosciuti restano incompleti.

Il catalogo include 21 cocktail distinti e altre varietà di vino/birra, con
quantità e gradazione modificabili e valori indicativi dichiarati. La migration
`20261004140000_alcohol_strength.sql` conserva la gradazione nei salvataggi,
negli aggiornamenti e negli snapshot, senza scalarla con le porzioni. Anche i
trigger delle calorie tengono conto della gradazione effettivamente registrata.

Il diario è caricato centralmente per data, evitando richieste identiche a ogni
cambio pagina. Correggere un ingrediente, modificare/eliminare un piatto o
concludere/eliminare una sessione palestra provoca un refresh esplicito. Le
modifiche nutrizionali invalidano anche la cache delle abitudini settimanali,
indipendentemente dal numero di ingredienti.

Aggiornamento del 6 ottobre: il recap in **Pasti** usa quadratini compatti con
icone e stato, senza numeri all’interno. Il riempimento rappresenta il rapporto
tra valore e target anche sotto i limiti `≤`; oltre un limite il quadratino è
pieno e arancione. Quantità e moltiplicatori del limite restano nel dettaglio
**Benessere**. Legumi e pesce usano gli ultimi sette giorni fino alla data
selezionata, mantenendo il target settimanale e mostrando nel dettaglio la
media giornaliera. Il conteggio non si azzera il lunedì. Vedi la
[guida alle buone abitudini](buone-abitudini.md).

## Confini delle modifiche al database e lavori successivi

Questa revisione mantiene il comportamento attuale: correggere un ingrediente
aggiorna anche i pasti collegati del passato. Congelare lo storico richiede una
decisione di prodotto. Le correzioni iniziali non richiedevano migrazioni;
l’aggiunta della gradazione alcolica usa la migration dedicata indicata sopra.
Le successive migrazioni per l’ordine degli ingredienti e delle schede palestra
sono descritte nell’aggiornamento in fondo al rapporto.

Restano interventi separati:

- Generare tipi Supabase dallo schema effettivo e verificare le risposte RPC
  senza cast manuali. Il progetto ospitato è condiviso: l’eventuale generazione
  deve essere limitata alle tabelle e funzioni di fitTrackr.
- Estendere i test SQL alla concorrenza sulle porzioni. Gli RPC modificati per
  l’alcol sono stati verificati su PostgreSQL isolato, inclusi vincoli e accesso
  fra utenti; il container di prova è stato rimosso dopo la verifica.
- Rimuovere il fallback degli alimenti legacy soltanto dopo aver verificato e
  migrato i record esistenti.
- Confermare sul telefono la navigazione tra pagine, la ripresa dopo sospensione
  e l’aggiornamento fra due versioni pubblicate.

Non riscrivere le migrazioni applicate e non resettare il database collegato
condiviso.

Verifica del database ospitato del 4 ottobre 2026, prima della funzione alcol: `supabase db push --dry-run`
e `supabase db push` completati con esito “Remote database is up to date”.
In quel momento non risultavano migrazioni pendenti; nessuna era stata applicata.

Dopo l’implementazione dell’alcol, il nuovo dry-run ha elencato soltanto
`20261004140000_alcohol_strength.sql`. La migration è stata applicata con
`supabase db push`, dopo i test locali, senza reset del database condiviso.

## Verifiche del refactoring e della funzione alcol

- `npm test -- --run`: **207 test superati in 46 file** (194/44 prima della funzione alcol), rispetto ai 166 della baseline.
- `npm run build`: TypeScript e build Vite/PWA superati.
- `npm run lint`: superato, senza errori o avvisi.
- `git diff --check`: superato.
- `supabase/tests/alcohol_strength.sql`: superato su PostgreSQL 17 isolato,
  dopo il replay di tutte le migrazioni del repository. Verificati salvataggio,
  modifica, snapshot/porzioni, calorie, zero, vincoli, rollback e RLS.
- Ultima verifica mirata dopo la rifinitura: 43 test superati in 4 file.
- La suite è stata verificata anche con URL e chiave Supabase fittizi locali,
  come nel workflow CI; nessun test richiede il database ospitato.

Misure del refactoring iniziale, prima dell’aggiunta delle bevande:

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

La build con i cocktail misura PantryPage a 28,95 kB (7,14 kB gzip) e il
precache PWA a 1.559,02 KiB. Le stime di volume, gradazione e nutrienti dei
cocktail restano indicative; quantità e gradazione si possono correggere.


## Aggiornamento: categorie, icone automatiche e schede palestra

- Cucina → Piatti: quattro pulsanti Colazione / Pranzo / Cena / Spuntino su
  una sola riga sopra **Cerca un piatto...**, con icona e stato attivo evidenziato.
  Nessun pulsante è selezionato all’apertura e non esiste il pulsante “Tutti”.
  Toccare una categoria sostituisce la selezione precedente; toccare di nuovo
  quella attiva la deseleziona e mostra tutti i piatti. La ricerca resta attiva
  durante questi cambiamenti. La categoria filtra anche i piatti preparati;
  un nuovo piatto parte dalla categoria selezionata, oppure senza categorie
  preselezionate quando il filtro è disattivato.
- Corretto il caso delle icone automatiche: gli ingredienti del diario avevano
  timestamp identici e venivano ordinati tramite UUID, cambiando il primo
  ingrediente. `meal_items.position` registra ora l’ordine dell’array sia in
  inserimento sia in modifica. Le letture del diario usano tale posizione.
  La migration riallinea i record storici collegati alle ricette; per quelli
  senza riferimenti l’ordine originario non è recuperabile con certezza.
  Anche l’elenco dei piatti pronti usa l’icona del primo ingrediente quando
  non è stata scelta un’icona personalizzata.
- Le schede palestra si spostano con ↑/↓. `gym_plans.position` e l’RPC
  `reorder_gym_plans` mantengono l’ordine per account. Lo spostamento è atomico,
  rifiuta ID estranei, duplicati o elenchi incompleti, e conserva l’ordine degli
  esercizi. La creazione appende; una modifica mantiene la posizione.
  Gli errori ripristinano l’elenco precedente e i refresh durante il salvataggio
  non sovrascrivono l’ordine appena scelto.
- Testo e pulsanti del popup PWA centrati orizzontalmente.
- Rimossa la nota esplicativa sotto le unità alcoliche, come richiesto.

Verifiche: **215 test in 47 file**, lint e build superati. Su PostgreSQL 17
isolato sono stati verificati il backfill storico, le scritture del diario, le
porzioni preparate, il riordino delle schede, l’inserimento in coda, i vincoli,
le richieste invalide e l’isolamento fra utenti. Superata anche la suite SQL
sulla gradazione alcolica dopo le nuove migration.

Durante l'intervento sull'ordine, il dry-run sul database condiviso elencava esclusivamente le migration
`20261004153000_preserve_diary_ingredient_order.sql` e
`20261004154000_gym_plan_order.sql` di questo repository.

Entrambe le migration sono state applicate al database condiviso con
`supabase db push`, dopo la verifica locale. Il container temporaneo è stato
rimosso. La build finale e il test del pannello dei piatti pronti sono superati.

Dopo la rifinitura dei pulsanti sono stati aggiornati e superati i **3 test di
KitchenDishes**: filtro e ricerca, cambio/deselezione della categoria, piatti
preparati e categoria iniziale delle nuove ricette. Superati anche build
TypeScript/Vite/PWA e `git diff --check`. Questa rifinitura non richiede altre
migrazioni.

## Aggiornamento della sicurezza del database condiviso — 4 ottobre 2026

Dopo gli interventi descritti sopra, Trackr ha applicato altre sette migrazioni al Supabase condiviso. FitTrackr conserva la propria correzione RLS/FK per `meal_items` e sei marker delle versioni finanziarie già applicate; lo storico è pubblicato nel commit `9462f84`. I nuovi controlli impediscono di associare un ingrediente a un pasto diverso da quello della sua entry. Le funzioni fitness esistenti sono mantenute, mentre le nuove RPC richiedono grant espliciti.

I test SQL isolati di Trackr hanno verificato la RPC pasto esistente, il rifiuto delle associazioni incoerenti e la foreign key composta. La verifica remota in sola lettura ha restituito zero associazioni pasto/entry incoerenti. Non sono stati cancellati dati fitness. Questo intervento non è un audit completo del frontend o delle Edge Functions FitTrackr. Stato e procedura: [database condiviso](../supabase/README.md) e [storico della sicurezza](../supabase/README-trackr-security-sync.md).
