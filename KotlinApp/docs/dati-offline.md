# Database locale e sincronizzazione

Web, Android e il futuro client iPhone usano lo **stesso progetto Supabase**. Un utente accede con il proprio account Trackrs e ritrova anche i dati inseriti prima di installare l’app. Il perimetro comprende tutti i dati fitTrackr accessibili a quell’account tramite le tabelle e le API della webapp. Le altre applicazioni che condividono il progetto mantengono il proprio perimetro di accesso.

## Database locale

Sul telefono usiamo **SQLite con Room nel modulo Kotlin Multiplatform `shared/`**, con `BundledSQLiteDriver` per avere la stessa implementazione SQLite su Android e iOS. Entità, DAO e migrazioni sono condivisi. Ogni piattaforma apre il file nella directory privata dell’app, con un archivio distinto per progetto Supabase e ID utente. Su Android le schermate osservano le query locali con `Flow`. [Room per Kotlin Multiplatform](https://developer.android.com/kotlin/multiplatform/room) · [Driver SQLite per Kotlin Multiplatform](https://developer.android.com/kotlin/multiplatform/sqlite)

- Organizzare i dati personali per area in tabelle relazionali. Mantenere gli ID Supabase, i riferimenti tra i record e l’ordine esplicito dove previsto dal web. Conservare i giorni del diario come date di calendario e gli istanti, come l’ora di una modifica, in UTC.
- Conservare nello stesso database le operazioni in attesa, l’avanzamento del primo scaricamento e i cursori di aggiornamento. Salvare i conflitti quando servono entrambe le versioni del dato. Una modifica locale e la relativa operazione da inviare si salvano insieme.
- Versionare lo schema Room ed esportarne le versioni nel repository. Le migrazioni devono conservare sia i dati scaricati sia le modifiche ancora da inviare.
- Aprire l’archivio solo per la sessione locale riconosciuta. Chiuderlo quando si esce o scatta il nuovo accesso dopo 30 giorni di inattività. I token restano nell’archivio protetto già usato dall’accesso Android. [Sessione e inattività](accesso-android.md#sessione-e-inattività)

## Copertura per area

| Area | Dati e operazioni da coprire |
| --- | --- |
| Profilo e impostazioni account | Profilo salute, obiettivi nutrizionali, stato della guida e nome utente. Rileggere i target dopo i ricalcoli server. Il server conferma la disponibilità del nome utente. |
| Pasti | Giorni, momenti del pasto, voci, ingredienti ordinati, quantità, unità e personalizzazioni. Creazione, modifica ed eliminazione passano per le operazioni del diario, anche per pasti da ricetta, preparazione o Sagebite. |
| Cucina | Ingredienti e valori nutrizionali, dispensa, ricette e relativi ingredienti, categorie, preferenze di cottura, preparazioni e porzioni residue. Conservare i riferimenti storici, anche per preparazioni esaurite. Propagare al diario e alla dispensa gli effetti confermati di una modifica. |
| Peso | Tutte le pesate e relative date. Rispettare il vincolo di una misurazione per account e giorno anche se web e telefono registrano un peso per la stessa data. |
| Fitness | Attività con durata e distanza, schede ordinate, esercizi personali, sessioni, carichi e serie. Conservare i dati della sessione così come registrati anche se la scheda cambia. |
| Storico, progressi e buone abitudini | Conservare l’intera cronologia personale. Ricostruire grafici e riepiloghi locali dai dati di origine, rispettando le regole del web sui giorni vuoti. Una correzione a un pasto o a una pesata aggiorna anche i periodi interessati. |
| Punti e classifica | Acquisire i risultati delle RPC esistenti e conservare l’ultima risposta disponibile con data di aggiornamento. Dopo l’invio delle modifiche al diario, aggiornare i punteggi dal server. Per gli altri utenti il telefono riceve solo i campi pubblicati dalla classifica. |
| Cataloghi e Sagebite | Rendere disponibili offline i cataloghi inclusi nell’app e i prodotti già acquisiti. La ricerca remota di nuovi codici, l’analisi di foto e le risposte di Sagebite richiedono rete. I pasti confermati da questi servizi rientrano nella normale sincronizzazione del diario. |

La lingua, il formato dei numeri e i permessi delle notifiche sono preferenze del dispositivo. La sessione di autenticazione usa l’archivio protetto della piattaforma. [API del diario, della cucina, del profilo e del peso](../../src/services/api.ts) · [API palestra](../../src/services/gymApi.ts) · [Punti e classifica](../../docs/gamification.md) · [Formato dei numeri](../../docs/formato-numeri.md)

## Ciclo di sincronizzazione

1. **Primo accesso.** Autenticare online e aprire un database privato per l’ID dell’account. Scaricare profilo, obiettivi e dati utili per la giornata nelle cinque sezioni con i relativi riferimenti. Completare poi lo storico di ogni area a pagine, conservando il punto raggiunto. Segnare ogni insieme come disponibile offline dopo il salvataggio completo in una transazione. Se il download si interrompe, riprenderlo alla connessione successiva.
2. **Aperture successive.** Mostrare subito i dati locali. All’apertura e al ritorno in primo piano chiedere un aggiornamento in parallelo. Accorpare le richieste ravvicinate e consentire una sola sincronizzazione alla volta per account.
3. **Scrittura.** Salvare nella stessa transazione SQLite la modifica e un’operazione da inviare, con ID univoco, entità, contenuto e versione server di partenza. Poi aggiornare la schermata dai dati locali. La coda sopravvive alla chiusura dell’app e agli aggiornamenti dello schema locale.
4. **Invio.** Programmare l’invio appena ci sono operazioni pendenti. Su Android usare WorkManager con rete connessa e tentativi progressivamente distanziati in caso di guasti temporanei. Così anche una sessione chiusa in palestra può partire in seguito, quando Android concede l’esecuzione. Al riavvio controllare sempre la coda. Rispettare le dipendenze anche tra aree, per esempio inviando la creazione di una ricetta prima del pasto che la usa. [Vincoli di rete e tentativi con WorkManager](https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work)
5. **Ricezione.** Acquisire anche i cambiamenti fatti dal web, incluse le cancellazioni. Per insiemi piccoli come profilo e obiettivi si può rileggere il dato completo. Per le liste si può dedurre una cancellazione solo da una lettura completa e coerente del relativo insieme. Per lo storico prevedere un flusso incrementale lato server, con cursore che identifica fino a dove il telefono ha ricevuto le modifiche dell’account. Ogni pagina e il suo cursore si salvano insieme. Il contratto deve raccordare il primo download agli aggiornamenti successivi, coprire anche le scritture web esistenti e segnalare le cancellazioni. Un cursore scaduto richiede un nuovo scaricamento che preservi le modifiche pendenti.

## Quando telefono e server divergono

- **Risposta persa.** Ogni tentativo ripete lo stesso ID operazione. Il server applica la modifica e ne registra l’esito nella stessa transazione. A richiesta ripetuta restituisce la ricevuta già salvata. Solo allora il telefono conferma l’operazione. Nel repository il diario Sagebite applica già questo principio ai pasti. [Ricevute e procedura Supabase](../../supabase/README.md)
- **Stesso dato modificato due volte.** Il server confronta la versione di partenza con quella attuale prima di scrivere. Due sessioni indipendenti si aggiungono entrambe. Se web e telefono correggono diversamente la stessa serie, conservare entrambe le versioni e permettere di scegliere quale tenere. Vale anche per una modifica locale a un dato eliminato sul web. Durante il download proteggere le modifiche ancora da inviare.
- **Effetti collegati.** Registrare il consumo di una porzione come una singola operazione. Il telefono può mostrarne l’effetto provvisorio. Se dal web è stata già consumata l’ultima porzione, conservare la registrazione locale da correggere e mostrare la quantità confermata dal server. Le regole su disponibilità e movimenti restano nelle operazioni di dominio di Supabase.
- **Token scaduto senza rete.** Continuare il diario locale finché la sessione locale resta valida. Riprendere gli invii dopo il rinnovo del token per lo stesso account. Al logout esplicito, mostrare le modifiche in attesa e conservarle nell’archivio privato, accessibile di nuovo con lo stesso account. Ogni accesso ai dati remoti usa i permessi dell’utente.

## Implementazione Android

Dopo l’accesso viene aperto Room e parte il download completo dei dati per la consultazione di **Pasti**. Comprende l’intero storico di pasti, voci e ingredienti, obiettivi, profilo salute, pesate, attività, sessioni e serie di palestra. Il diario usa gli ultimi quattro insiemi per le calorie bruciate della giornata. Le letture sono paginate per ID e usano i permessi dell’account autenticato.

L’app ripete l’aggiornamento al ritorno in primo piano, quando torna la rete mentre il processo è attivo e da **Impostazioni → Dati e sincronizzazione**. Questa versione scarica di nuovo gli stessi insiemi e sostituisce la copia locale in una transazione dopo il successo di tutte le letture. Un download interrotto lascia visibile l’ultima copia completa. Al primo avvio il diario distingue lo scaricamento e gli errori da una giornata realmente vuota.

## Prossime tappe

La pesata è il primo caso previsto per verificare le scritture offline, il vincolo di una pesata al giorno e la gestione delle modifiche fatte da due dispositivi. In **Pasti** la versione attuale supporta la consultazione. Gli editor richiedono anche cataloghi, ricette, dispensa, preparazioni e un contratto di invio che permetta di ripetere le operazioni in sicurezza. Il ciclo illustrato sopra descrive l’obiettivo completo con aggiornamenti incrementali e coda in background.

Per ogni gruppo di dati, mappare le letture e le scritture attuali, gli identificativi, le dipendenze e gli effetti delle cancellazioni. Riutilizzare le RPC esistenti per le operazioni composte, come registrare una porzione. Dove manca il supporto per riconoscere un invio ripetuto o recuperare una cancellazione avvenuta offline, progettare un’estensione compatibile nello stesso Supabase. Le scritture già effettuate dalla webapp devono arrivare al telefono anche quando passano direttamente dalle tabelle.

Il criterio di completamento si applica a ogni area. Con un account già utilizzato sul web, lo storico scaricato deve essere consultabile offline. Per i dati modificabili, aggiunte, correzioni ed eliminazioni devono convergere tra web e telefono dopo un riavvio o una perdita di rete. Per i risultati calcolati verificare che si aggiornino anche gli effetti collegati, per esempio porzione residua, riepilogo nutrizionale e punti dopo la modifica di un pasto.
