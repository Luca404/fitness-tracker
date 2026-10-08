# Pasti occasionali da foto

Dal diario: scegli il pasto → **Occasionale** → **Da foto**. L'inserimento manuale resta disponibile nello stesso punto.

Scatta una foto o scegli un JPEG, PNG o WebP dalla galleria. È possibile aggiungere fino a 1000 caratteri con il nome del piatto o la descrizione del menù. La foto viene compressa nel browser (lato massimo 1600 pixel, upload massimo 4 MB, originale massimo 15 MB), inviata al server e analizzata tramite OpenAI Responses. Non viene archiviata nell'app; la richiesta usa `store: false`.

La revisione mostra subito calorie e macro. **Ingredienti e quantità** è chiuso inizialmente: aprendolo si possono cambiare nomi, categorie, pesi, calorie e macro, rimuovere componenti e aggiungere ingredienti. I condimenti dedotti sono indicati come **Ipotizzati** durante la revisione. Gli avvisi espongono le incertezze del modello senza percentuali di accuratezza.

I pesi proposti sono quelli del cibo già pronto, non degli ingredienti crudi. La modifica del peso scala calorie e macro in proporzione; una correzione manuale dei nutrienti diventa la nuova base per le successive modifiche del peso. La percentuale mangiata (1–100%, con scorciatoie Tutto/¾/Metà) si applica una sola volta al momento della registrazione. Il riepilogo mostra la quantità che verrà registrata, mentre i dettagli si riferiscono all'intera porzione fotografata.

**Registra nel diario** usa la normale registrazione atomica del pasto senza salvare ricette o creare lotti preparati. Nessun ingrediente proposto è collegato al catalogo personale; gli ingredienti aggiunti dalla ricerca vengono anch'essi scollegati dal catalogo. Le voci stimate usano `source: ai_meal_photo`, distinto da `ai_photo` usato per trascrivere le etichette. Questo campo testuale è già supportato dal database e dalle RPC: non servono migrazioni.

Il diario mostra **Stimato da foto** per le registrazioni che contengono almeno una voce con quella provenienza. Le successive modifiche usano la stessa revisione, applicata alle quantità già registrate, senza una nuova percentuale. Foto, descrizione, avvisi e singole motivazioni delle ipotesi non vengono conservati; restano nome, ingredienti, quantità, nutrienti e provenienza. Fibre, zuccheri e sale non stimati restano sconosciuti, non zero.

L'analisi richiede una sessione autenticata. Il server valida formato, dimensione, descrizione, risposta strutturata e plausibilità di massa/energia; foto senza un pasto riconoscibile, rifiuti e risposte incomplete non producono registrazioni. L'utente deve premere il pulsante di registrazione dopo la revisione. Errori di analisi o salvataggio permettono di riprovare mantenendo i dati.

## Configurazione

Deploy della funzione dedicata nel progetto Supabase usato dal frontend:

```bash
supabase functions deploy analyze-meal-photo --no-verify-jwt
```

La funzione verifica autonomamente il bearer token tramite Supabase Auth, come le altre funzioni dell'app. `--no-verify-jwt` disabilita solo la verifica JWT del gateway, per permettere la verifica Auth anche con le chiavi di firma correnti.

Riutilizza il secret server `OPENAI_API_KEY` già presente. Il modello viene scelto in ordine da `OPENAI_MEAL_PHOTO_MODEL`, `OPENAI_VISION_MODEL`, oppure `gpt-4.1-mini`. Il modello configurato deve supportare immagini e Structured Outputs. Non mettere la chiave OpenAI nelle variabili del frontend.

## Verifica

I test coprono input invalidi, sessione mancante, rifiuti/errori del modello, stime impossibili, revisione espandibile, correzioni e quantità mangiata, ingredienti scollegati, retry e registrazione diretta. Le risposte OpenAI e le scritture Supabase sono simulate nei test: la precisione nutrizionale su foto reali richiede valutazione separata.
