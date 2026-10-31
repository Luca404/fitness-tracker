# Guida rapida

Implementazione del 31 ottobre 2026.

Dopo il salvataggio iniziale di profilo e obiettivi, un nuovo utente viene
indirizzato a `/tutorial`. La guida contiene sei tappe: ingredienti da codice
a barre, foto dell’etichetta o inserimento manuale; ricette salvate e porzioni
preparate; registrazione del cibo consumato e stime da foto del pasto; peso;
schede palestra, sessioni e altre attività; buone abitudini.

Ogni tappa offre **Salta tutorial**. Sono disponibili Avanti, Indietro e gli
indicatori per passare direttamente a un argomento. L’ultima azione è
**Inizia a usare fitTrackr**. Non vengono creati alimenti, pasti o allenamenti
di esempio. La guida distingue la foto dell’etichetta dalla foto di un pasto
e la preparazione di un piatto dalla registrazione di una porzione consumata.

**Impostazioni → Guida rapida → Rivedi il tutorial** apre sempre la stessa
guida da capo. Completandola o saltandola si ritorna alle impostazioni;
al primo utilizzo si entra invece in Pasti. Il recupero password e la
configurazione del profilo mantengono la precedenza sulla guida.

## Stato sul profilo

La migrazione `20261031120000_quick_tutorial.sql` aggiunge
`user_health_profiles.tutorial_seen`: `true` per i profili già esistenti,
`false` come default per le nuove righe. Non modifica utenti Auth, tabelle
finanziarie, policy o RPC. L’RPC esistente di onboarding omette questo campo:
la creazione usa il default, le successive modifiche del profilo preservano
la preferenza.

Saltare o completare imposta il campo a `true`, con un UPDATE limitato allo
user ID corrente e soggetto alle policy esistenti. La preferenza è quindi
condivisa fra dispositivi. Un profilo con campo assente è trattato come
preesistente, per compatibilità durante il rilascio.

La chiusura aggiorna subito lo stato locale per non bloccare l’accesso
all’app. Se la scrittura fallisce, un messaggio segnala che la guida potrebbe
riapparire al prossimo accesso. Un’eventuale riapertura manuale non azzera
la preferenza salvata.

## Verifica e rilascio

I test React coprono navigazione iniziale, recupero password prioritario,
profili preesistenti, salto, avanzamento, ritorno indietro, navigazione per
tappa, focus del titolo, riapertura dalle impostazioni e chiusura con errore
di rete. Il test SQL `supabase/tests/quick_tutorial.sql` usa una fixture minima
in un database vuoto `fittrackr_tutorial_test_*`: verifica i due default,
la conservazione del flag durante un upsert, il vincolo NOT NULL e
l’isolamento degli UPDATE tramite una policy di proprietà equivalente.

Applicare la migrazione prima del frontend. La verifica grafica di desktop,
mobile, altezza ridotta e ingrandimento del testo resta manuale, come previsto
dal repository. Il contenuto della guida scorre separatamente dai controlli,
con spazi per le safe area e indicatori utilizzabili da tastiera.

Verifica del 31 ottobre: **529 test frontend passati**, build e lint riusciti.
Il test SQL è passato in un container PostgreSQL 17 temporaneo senza rete,
con la directory Supabase montata in sola lettura. La migrazione è stata
applicata al progetto ospitato dopo un dry-run che elencava soltanto questo
file ed è stata copiata identica nel repository Trackr per tenere allineato
lo storico condiviso. Nessun database applicativo locale è stato aggiornato.
Il frontend non è stato pubblicato in questa sessione.
