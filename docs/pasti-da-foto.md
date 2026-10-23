# Pasti occasionali da foto

Dal diario: scegli il pasto → **Occasionale** → **Da foto**. L'inserimento manuale resta disponibile nello stesso punto.

La funzione è pubblicata dall'8 ottobre 2026. Se nell'app installata compare **È disponibile una nuova versione di fitTrackr.**, premi **Aggiorna** per caricare il rilascio.

Scatta una foto o scegli un JPEG, PNG o WebP dalla galleria. È possibile aggiungere fino a 1000 caratteri con il nome del piatto o la descrizione del menù. La foto viene compressa nel browser (lato massimo 1600 pixel, upload massimo 4 MB, originale massimo 15 MB), inviata al server e analizzata tramite OpenAI Responses. Non viene archiviata nell'app; la richiesta usa `store: false`.

La revisione mostra subito calorie e macro. **Ingredienti e quantità** è chiuso inizialmente: aprendolo si possono cambiare nomi, categorie, pesi, calorie e macro, rimuovere componenti e aggiungere ingredienti. I condimenti dedotti sono indicati come **Ipotizzato** durante la revisione. Gli avvisi espongono le incertezze del modello senza percentuali di accuratezza.

I pesi proposti sono quelli del cibo già pronto, non degli ingredienti crudi. La modifica del peso scala calorie e macro in proporzione; una correzione manuale dei nutrienti diventa la nuova base per le successive modifiche del peso. La percentuale mangiata (1–100%, con scorciatoie Tutto/¾/Metà) si applica una sola volta al momento della registrazione. Il riepilogo mostra la quantità che verrà registrata, mentre i dettagli si riferiscono all'intera porzione fotografata.

**Registra nel diario** usa la normale registrazione atomica del pasto senza salvare ricette o creare lotti preparati. Nessun ingrediente proposto è collegato al catalogo personale; gli ingredienti aggiunti dalla ricerca vengono anch'essi scollegati dal catalogo. Le voci stimate usano `source: ai_meal_photo`, distinto da `ai_photo` usato per trascrivere le etichette. Questo campo testuale è già supportato dal database e dalle RPC: non servono migrazioni.

Il diario mostra **Stimato da foto** per le registrazioni che contengono almeno una voce con quella provenienza. Le successive modifiche usano la stessa revisione, applicata alle quantità già registrate, senza una nuova percentuale. Foto, descrizione, avvisi e singole motivazioni delle ipotesi non vengono conservati; restano nome, ingredienti, quantità, nutrienti e provenienza. Fibre, zuccheri e sale non stimati restano sconosciuti, non zero.

Anche aprendo il pasto registrato, i dettagli degli ingredienti sono inizialmente chiusi. **Modifica piatto** permette di correggere quantità e nutrienti anche quando la stima contiene un solo componente. Se tutti i componenti stimati vengono rimossi e sostituiti con alimenti inseriti manualmente, l'indicazione **Stimato da foto** non compare più.

L'analisi richiede una sessione autenticata. Il server valida formato, dimensione, descrizione, risposta strutturata e plausibilità di massa/energia; foto senza un pasto riconoscibile, rifiuti e risposte incomplete non producono registrazioni. L'utente deve premere il pulsante di registrazione dopo la revisione. Errori di analisi o salvataggio permettono di riprovare mantenendo i dati.

## Configurazione

Deploy della funzione dedicata nel progetto Supabase usato dal frontend:

```bash
supabase functions deploy analyze-meal-photo --no-verify-jwt
```

La funzione verifica autonomamente il bearer token tramite Supabase Auth, come le altre funzioni dell'app. `--no-verify-jwt` disabilita solo la verifica JWT del gateway, per permettere la verifica Auth anche con le chiavi di firma correnti.

Riutilizza il secret server `OPENAI_API_KEY` già presente. Il modello viene scelto in ordine da `OPENAI_MEAL_PHOTO_MODEL`, `OPENAI_VISION_MODEL`, oppure `gpt-4.1-mini`. Il modello configurato deve supportare immagini e Structured Outputs. Non mettere la chiave OpenAI nelle variabili del frontend.

### Diagnostica degli errori — 24 ottobre 2026

I log remoti del 23 ottobre hanno confermato tre risposte **OpenAI HTTP 401**: la chiave API del servizio non veniva accettata. Non era un errore della descrizione o della stima nutrizionale. Per ripristinare l’analisi occorre aggiornare `OPENAI_API_KEY` nei secret delle Edge Function del progetto `nitbisweytddtigoebeh` con una chiave valida. Non serve modificare il database. Non salvare chiavi nel repository, nei log o nelle variabili `VITE_`.

Una prova minima server-side sullo stesso endpoint Responses e modello ha confermato `401 invalid_api_key` (messaggio riconosciuto come “Incorrect API key”). Il secret è presente, inizia con il prefisso atteso e non contiene spazi iniziali/finali. La prova usa solo testo sintetico, `store: false`, senza foto o dati utente; la funzione diagnostica temporanea, protetta da token e scadenza, è stata eliminata subito dopo. Questo verifica il rifiuto attuale della credenziale, senza stabilire quando o perché sia diventata inutilizzabile. Per le altre risposte 401 il messaggio resta generico sull’autenticazione: vedi i [codici di errore OpenAI](https://developers.openai.com/api/docs/guides/error-codes).

Le funzioni di analisi piatto ed etichetta distinguono ora chiave rifiutata, accesso negato, credito/budget esaurito, limite temporaneo di richieste, immagine non leggibile, configurazione incompatibile e indisponibilità del servizio. Il timeout restituisce HTTP 504. Il client spiega anche errori di rete e risposte non JSON del gateway. La foto e la descrizione rimangono disponibili dopo un errore.

La diagnostica registra stato, codice OpenAI, modello e request ID, senza messaggi grezzi del provider che potrebbero contenere credenziali. La risposta include `code` e, quando disponibile, `request_id` per il supporto. Il formato Structured Outputs segue la [documentazione ufficiale OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

Le due Edge Function sono state pubblicate il 24 ottobre. Verifica locale finale: 318 test superati in 57 file, build frontend e lint superati; controllo TypeScript separato della funzione piatto superato. Il controllo TypeScript 6 esteso alla funzione etichetta incontra due problemi preesistenti in `analysisConfirmation.ts` (tipo `BufferSource`) e nella validazione `package_piece_count`; non è una verifica completa dell’ambiente Deno. Le richieste remote senza autenticazione hanno restituito `OPTIONS 200` e `POST 401` con il messaggio aggiornato.

Dopo l’aggiornamento del secret da parte dell’utente, una nuova prova minima server-side su Responses con `gpt-4.1-mini` ha restituito **HTTP 200**: l’autenticazione OpenAI è ripristinata. Anche questa prova ha inviato solo testo sintetico, `store: false`, senza foto o dati utente; la funzione temporanea è stata eliminata subito dopo. L’analisi completa con foto reale e descrizione resta da verificare nell’app.

## Verifica

I test coprono input invalidi, sessione mancante, rifiuti/errori del modello, stime impossibili, revisione espandibile, correzioni e quantità mangiata, ingredienti scollegati, retry e registrazione diretta. Le risposte OpenAI e le scritture Supabase sono simulate nei test: la precisione nutrizionale su foto reali richiede valutazione separata.

## Pubblicazione verificata — 8 ottobre 2026

Il codice della funzione è nel commit [8bf11f3](https://github.com/Luca404/fitness-tracker/commit/8bf11f3bf37ff3ebde33a721105857afcc47f0b5), pubblicato su `main`.

- **Supabase:** `analyze-meal-photo` pubblicata nel progetto `nitbisweytddtigoebeh`, riutilizzando `OPENAI_API_KEY` e `OPENAI_VISION_MODEL` già presenti. La verifica dell'endpoint remoto ha restituito `OPTIONS 200` e `POST 401` con **Sessione non valida.** per una richiesta senza autenticazione; non sono state inviate foto in questa verifica.
- **Vercel:** rilascio di produzione del medesimo commit completato con esito positivo. Il controllo del rilascio è disponibile nella [pagina Vercel](https://vercel.com/luca404s-projects/fitness-tracker/DnbvXK52c1XKdToGcc8eQZ65Qahv), che richiede accesso all'account.
- **Controlli locali:** 257 test superati in 52 file, build TypeScript/Vite/PWA, lint e controllo degli spazi del diff superati. Verificato anche il codice della Edge Function con TypeScript e dichiarazioni dell'ambiente Deno.
- **CI:** test, build e lint superati nella [verifica GitHub Actions del commit](https://github.com/Luca404/fitness-tracker/actions/runs/37816619269).
- **Interfaccia:** revisione e scelta della foto controllate in browser con viewport largo 320 pixel e dati di esempio, senza scorrimento orizzontale.

La pubblicazione non ha richiesto migrazioni del database. Il controllo remoto ha verificato disponibilità e rifiuto delle richieste anonime; non è stata eseguita un'analisi autenticata con una foto reale e non è stata misurata l'accuratezza nutrizionale.
