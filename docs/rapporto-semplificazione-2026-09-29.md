# Rapporto di analisi e semplificazione di fitTrackr

Data: 29 settembre 2026. Ambito: codice frontend, servizi, Edge Functions, schema e migrazioni Supabase, test, configurazione e documentazione. Analisi statica del repository e verifiche locali; database ospitato e servizi esterni non sono stati interrogati.

## Sintesi

Il progetto funziona e ha una base solida: TypeScript rigoroso, moduli separati per dominio, migrazioni con controlli di accesso e test per molte regole pure. La complessità maggiore è concentrata nei flussi Pasti–Piatti–Dispensa: gli stessi dati vengono trasformati e conservati più volte nel client, mentre parte della logica nutrizionale è ripetuta tra client, funzioni SQL ed Edge Functions. La semplificazione più utile consiste nel ridurre gli stati derivati e le trasformazioni parallele, mantenendo nel database le operazioni atomiche sulle scorte.

Verifiche eseguite: `npm test -- --run` (25 file, 110 test superati), `npm run build` e `npm run lint` superati. Il build produce un chunk `PantryPage` di 474,51 kB (124,76 kB gzip), un chunk dei grafici di 336,56 kB (99,29 kB gzip) e precache PWA di 1.475,44 KiB. Questi valori sono misure del build, non dei tempi reali su rete o dispositivo.

## Priorità 0: correttezza prima del refactor

### 1. Associare esplicitamente i dati caricati alla loro data

**Evidenza.** `DataContext` memorizza un solo array `meals` e `workouts`; `fetchForDate` conserva i dati precedenti finché la nuova richiesta termina, e le mutazioni aggiornano gli array senza verificare la data della risposta. Le tre pagine Pasti, Allenamenti e Benessere avviano ognuna il caricamento della data selezionata (`src/contexts/DataContext.tsx:87-94,195-212,249-321`; `src/pages/MealsPage.tsx:68-70`; `src/pages/WorkoutPage.tsx:16-18`; `src/pages/WellbeingPage.tsx:11-13`).

**Effetto possibile.** Se si cambia data mentre una scrittura è in volo, il risultato di una giornata può essere aggiunto allo stato della giornata nuova. Una vista appena aperta può inoltre usare temporaneamente pasti della data precedente.

**Intervento.** Tenere un unico stato `{date, meals, workouts, status}` oppure una piccola cache indicizzata per data; applicare una risposta solo alla data a cui appartiene. Durante il cambio data, mostrare stato di caricamento coerente. Le mutazioni aggiornino solo la voce della data corretta o richiedano il ricaricamento di quella data. Aggiungere un test che cambi data prima della risoluzione di una richiesta e un test di mutazione concorrente.

### 2. Correggere l'indicatore degli zuccheri

**Evidenza.** `GoodHabits` prende una soglia chiamata `free_sugars` e la confronta con la somma di `sugars_g` di tutti gli alimenti (`src/components/meals/GoodHabits.tsx:45-56`; `src/utils/goodHabits.ts:60-90`; `src/data/nutritionGuidelines.ts:63-70`). `sugars_g` rappresenta gli zuccheri totali dell'etichetta, quindi include anche quelli naturalmente presenti.

**Intervento.** Eliminare il giudizio di conformità finché non esiste un dato affidabile per gli zuccheri liberi, oppure presentare gli zuccheri totali come dato informativo senza confrontarli con quella soglia. Questa scelta riduce anche codice e ambiguità del modello.

### 3. Rendere affidabile il refresh settimanale di “Buone abitudini”

**Evidenza.** Il refresh usa come chiave il numero totale di ingredienti, non il loro contenuto (`src/components/meals/GoodHabits.tsx:18-43`). Una modifica a quantità o nutrienti che lasci invariato il numero di righe non provoca la nuova lettura settimanale. Lo stesso componente è montato sia in Pasti sia in Benessere e carica separatamente lo stesso intervallo.

**Intervento.** Passare una revisione esplicita incrementata dopo le mutazioni o invalidare una cache per settimana; effettuare una sola lettura per intervallo. Evitare di derivare una chiave di invalidazione da un conteggio che non rappresenta i dati.

## Priorità 1: ridurre i punti in cui vive la stessa logica

### 4. Eliminare `Meal.items` come seconda copia di `Meal.entries[].items`

**Evidenza.** Il tipo `Meal` contiene sia le voci annidate sia un array appiattito; `api.hydrateMeals` e `DataContext` ricostruiscono e aggiornano entrambi (`src/types/index.ts:45-54`; `src/services/api.ts:84-123`; `src/contexts/DataContext.tsx:259-309`). Storico e statistiche consumano la copia piatta.

**Intervento.** Conservare solo `entries`; esporre una funzione pura `mealItems(meal)` o calcolare i totali dove servono. Questo elimina sincronizzazioni e casi in cui le due rappresentazioni divergono. Migrare i consumatori in un unico passaggio con test sui totali e sulle modifiche dei pasti.

### 5. Unificare il calcolo nutrizionale delle porzioni

**Evidenza.** La moltiplicazione per quantità e l'arrotondamento ricompaiono in `calcNutrition`, `DishEditor.updateQuantity`, `MealHub.updateExtraQuantity`, `MealHub.confirmPick`, funzioni SQL e trigger (`src/services/nutrition.ts:336-361`; `src/components/meals/DishEditor.tsx:47-63`; `src/components/meals/MealHub.tsx:187-210,223-239`; `supabase/migrations/20260924220000_enforce_ingredient_nutrition.sql:27-119`).

**Intervento.** Nel client usare una sola funzione pura di scala per anteprima e modifica, con una regola di arrotondamento documentata. Nel database mantenere l'autorità sul valore persistito e sulle scorte; confrontare con pochi casi condivisi g/ml/pezzi/null. Non tentare di condividere codice TypeScript con PL/pgSQL tramite un nuovo livello infrastrutturale.

### 6. Spezzare `PantryPage` secondo le fasi già presenti

**Evidenza.** La pagina è lunga 943 righe e contiene lista, filtri, scansione, foto, ricerca, form manuale, revisione AI, modifica e salvataggio. Mantiene molti `useState` paralleli e un `PendingFood` molto ampio (`src/pages/PantryPage.tsx:15-59,218-247,262-313,427-524`).

**Intervento.** Estrarre una funzione di conversione verso `PantryItem` e una di validazione, poi componenti per lista, scelta sorgente e revisione/quantità. Usare uno stato di flusso discriminato (`step` con i dati pertinenti) o un reducer locale: un solo punto di reset e transizioni esplicite. Fermarsi a 3–4 unità comprensibili; evitare un sistema generale di form.

### 7. Ridurre la duplicazione fra Cucina e selezione pasti

**Evidenza.** `KitchenDishes` e `MealHub` duplicano `DishItem` → `DishItemDraft`, calcolo dei totali, caricamento dei piatti, scelta dell'icona e operazioni di salvataggio (`src/components/kitchen/KitchenDishes.tsx:15-45,61-107`; `src/components/meals/MealHub.tsx:27-55,119-145`).

**Intervento.** Condividere soltanto le funzioni pure di conversione e dei totali, e un piccolo servizio per le operazioni sul piatto. Mantenere le due interfacce distinte: i loro flussi utente sono diversi. Eliminare inoltre il ramo “piatto suggerito” inattivo in Cucina dopo verifica di prodotto (`src/components/kitchen/KitchenDishes.tsx:150-161,237-240`; `src/data/suggestedDishes.ts`).

### 8. Semplificare `DataContext` senza moltiplicare i provider

**Evidenza.** Un provider di 353 righe concentra profilo, obiettivi, media peso, diario, allenamenti, toast e scritture. Il ricalcolo automatico è duplicato fra caricamento profilo e aggiornamento peso (`src/contexts/DataContext.tsx:105-193`). `SettingsContext` contiene solo data selezionata e “oggi”, calcolato a ogni render ma senza timer per il cambio di giorno (`src/contexts/SettingsContext.tsx:14-21`).

**Intervento.** Estrarre prima la funzione asincrona condivisa “carica peso → valuta ricalcolo → salva obiettivi”; rendere `today` un valore aggiornabile al cambio giorno o calcolato al momento dell'uso. Poi separare lo stato del diario da quello del profilo solo se questo riduce davvero gli aggiornamenti incrociati. Evitare di introdurre una libreria di state management per un'app di queste dimensioni.

### 9. Rendere `api.ts` un adattatore semplice e tipizzato

**Evidenza.** Le query `getMealsForDate` e `getMealsForRange` usano lo stesso hydrator, che esegue fino a quattro query e filtra tutti gli item per ogni pasto/voce (`src/services/api.ts:72-123,254-264`). Numerose risposte vengono forzate con `as` anziché essere tipizzate dal database. L'arricchimento degli alimenti legacy per nome avviene a ogni lettura (`src/services/api.ts:10-32`).

**Intervento.** Generare i tipi Supabase dallo schema, creare mappe per ID durante l'hydration e usare selezioni più strette. Per lo storico leggere solo i valori necessari ai grafici; per l'arricchimento legacy fare una migrazione dati verificata e poi rimuovere il fallback applicativo. Conservare le RPC che rendono atomiche le scritture.

### 10. Limitare la duplicazione SQL solo con nuove migrazioni

**Evidenza.** Le funzioni `add_meal_entry`, `update_meal_entry`, `create_dish_with_items` e `update_dish_with_items` sono state ridefinite molte volte nelle migrazioni; le ultime funzioni contengono grandi blocchi simili per inserimento, ripristino e consumo delle scorte (`supabase/migrations/20260924210000_meal_customizations.sql:11-233`). Esistono anche wrapper per le categorie dei piatti (`supabase/migrations/20260924200000_dish_meal_categories.sql:7-55`) e trigger per la propagazione nutrizionale (`supabase/migrations/20260924160000_sync_pantry_nutrition.sql:35-101`; `supabase/migrations/20260924220000_enforce_ingredient_nutrition.sql:27-119`).

**Intervento.** Disegnare una funzione interna per il consumo delle scorte e una per il ripristino, richiamate dalle RPC pubbliche. Consolidare la versione corrente in `schema.sql` come riferimento e documentare la responsabilità di ogni trigger. Le migrazioni già applicate restano immutabili: eventuali sostituzioni devono essere nuove migrazioni, dopo test su database locale e revisione del `db push --dry-run` del progetto condiviso.

**Decisione di prodotto richiesta prima di cambiare il comportamento.** Oggi la modifica di un ingrediente in dispensa o di una ricetta aggiorna anche pasti registrati in passato (`supabase/migrations/20260924160000_sync_pantry_nutrition.sql:59-82`; `supabase/migrations/20260924190000_piece_portions.sql:360-372`). Se il diario deve essere una fotografia storica, congelare i nutrienti al momento della registrazione semplificherebbe il sistema ed eliminerebbe molta propagazione; richiede però migrazione e scelta esplicita sul significato dei dati esistenti.

## Priorità 2: performance, pulizia e manutenzione

### 11. Caricare scanner e foto quando si aprono

`PantryPage` importa direttamente `BarcodeScanner` e `NutritionLabelPhoto` (`src/pages/PantryPage.tsx:9-10`) pur mostrandoli solo in due modalità. Caricarli dinamicamente con `React.lazy`; misurare nuovamente il build e il caricamento reale. La PWA precache attualmente include 31 file: se si vuole risparmiare anche spazio e traffico di installazione, rivedere separatamente la strategia di precache. Il chunk Recharts è grande, ma le pagine che lo usano sono già caricate per percorso: intervenire solo dopo misura su dispositivo.

### 12. Rimuovere codice e asset davvero inattivi

`src/data/suggestedDishes.ts` non ha import applicativi; `lookupBarcode` in `src/services/nutrition.ts:325` non ha chiamanti; `src/App.css`, `src/assets/hero.png`, `react.svg`, `vite.svg`, `public/app-icon.svg`, `public/favicon.svg` e `public/icons.svg` non risultano referenziati nel codice attivo. Eliminare dopo una ricerca finale dei riferimenti di deploy e documentazione. Verificare se `react-is` serve come dipendenza diretta: il lockfile mostra che è anche dipendenza transitiva di Recharts. Rimuovere le voci inutili dal README insieme ai file.

### 13. Testare i confini che possono rompere dati reali

I 110 test coprono soprattutto utility e componenti; non ci sono test delle Edge Functions né prove end-to-end delle RPC/trigger SQL nel repository. Aggiungere pochi scenari di integrazione su Supabase locale: aggiunta → consumo scorte, modifica → ripristino/nuovo consumo, eliminazione → ripristino, unità in pezzi, archiviazione/riattivazione, aggiornamento nutrizionale, isolamento fra utenti. Per il frontend aggiungere i due casi di concorrenza sulle date e il refresh delle abitudini. Collegare `test`, `build` e `lint` a CI. Non aggiungere test che ripetono semplicemente l'implementazione.

### 14. Allineare documentazione e responsabilità dei file

Il README descrive `suggestedDishes.ts` come template riservati e `PantryPage` come vista autonoma legacy, mentre il percorso attuale passa da Cucina (`src/App.tsx:60-62`; `src/pages/KitchenPage.tsx:5-33`). La documentazione storica dei piani può restare archivio, ma il README dovrebbe descrivere solo il comportamento attuale e riportare una mappa breve delle regole che vivono nel database.

## Sequenza consigliata

1. Correggere data/stato concorrente e indicatori nutrizionali; aggiungere i relativi test.
2. Togliere la copia `Meal.items` e unificare scala nutrizionale e conversioni dei piatti.
3. Scomporre `PantryPage` e ridurre il ricalcolo duplicato del profilo.
4. Tipizzare e snellire l'adattatore API; misurare lazy loading di scanner e foto.
5. Testare le RPC su database locale, poi semplificare le funzioni SQL con nuove migrazioni.
6. Eliminare file inattivi e aggiornare README e CI.

La scelta sulla storicità dei valori nutrizionali va fatta prima del punto 5: determina quanta logica di sincronizzazione SQL sia effettivamente necessaria.
