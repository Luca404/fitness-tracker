# Sagebite

Sagebite è l’assistente AI di fitTrackr. Su mobile aprilo dall’icona a fumetto accanto a **Impostazioni**. Su desktop trovi **Sagebite** nella barra laterale. Puoi chiudere il pannello, cambiare sezione e riprendere la conversazione finché l’app resta aperta.

## Consultare i tuoi dati

| Domanda | Dati consultati |
| --- | --- |
| «Quante proteine ho registrato negli ultimi sette giorni?» | Media dei giorni con pasti registrati, giorni coperti e obiettivo corrente, quando impostato. |
| «Quali piatti ho registrato ieri a pranzo?» | Voci del diario, ingredienti e quantità registrate. Per un piatto pronto, la porzione è espressa in grammi cotti. |
| «Come è cambiato il mio peso nell’ultimo mese?» | Misurazioni registrate e relative date. |
| «Quante volte mi sono allenato questa settimana?» | Attività registrate e sedute in palestra completate. |

I riepiloghi e lo storico di peso e attività coprono fino a 90 giorni per consultazione. Il dettaglio dei pasti copre fino a 7 giorni. I giorni senza pasti registrati restano sconosciuti e sono esclusi dalle medie del diario. I target mostrati sono quelli correnti.

Per le domande personalizzate, Sagebite legge da Supabase l’obiettivo del profilo e i target correnti di calorie e proteine. Può recuperare anche l’ultima pesata con la data. Per valutare l’andamento consulta direttamente lo storico. Se non specifichi un periodo, controlla gli ultimi 30 giorni e si estende a 90 se trova meno di due pesate. Le domande generali sugli alimenti e la sola registrazione di un pasto usano i dati necessari a quelle richieste.

## Registrare un pasto

| Cosa hai mangiato | Cosa puoi scrivere |
| --- | --- |
| Alimento di base | «Oggi a pranzo ho mangiato 150 g di riso basmati cotto.» |
| Ingrediente in dispensa | «Oggi a colazione ho mangiato 150 g del mio yogurt in dispensa.» Usa il nome con cui l’hai salvato. |
| Ricetta salvata | «Registra una porzione della mia ricetta Polpette di ceci per la cena di oggi.» Una porzione corrisponde alle quantità della ricetta salvata. |
| Piatto pronto | «Per la cena di oggi, registra 150 g del risotto pronto che ho preparato ieri.» Indica i grammi cotti che hai mangiato. |

Una frase completa su un singolo alimento può produrre subito il messaggio **Registrato**, con il pasto e la data. Se manca un dettaglio rilevante, come il peso a crudo o cotto, Sagebite chiede di precisarlo. Quando trova più preparazioni con lo stesso nome, può distinguerle per data e grammi rimasti. Se compare una proposta, **Registra pasto** la salva e **Scarta** la chiude. Dopo il salvataggio puoi vedere o correggere la voce in **Pasti**.

Per un alimento di base pesato dopo la cottura, il calcolo può usare le [rese di cottura di fitTrackr](peso-piatti-preparati.md#scegliere-la-cottura) e il messaggio indica quando i valori sono stimati. La registrazione di un piatto pronto scala la porzione dal peso residuo della preparazione.

## Istruzioni, accesso e conversazione

Il **prompt di sistema** è il campo `instructions` inviato alla Responses API. Definisce il ruolo di Sagebite, il tono in italiano e quando consultare il profilo o il diario. Il modello richiede gli strumenti necessari e riceve i risultati come contesto della domanda. Il backend interpreta gli argomenti e applica le regole di salvataggio. Supabase verifica la sessione e limita letture e scritture all’account autenticato. [Istruzioni nel codice](../supabase/functions/fittrackr-chat/index.ts#L13) · [Definizione degli strumenti](../supabase/functions/fittrackr-chat/tools.ts) · [Function calling di OpenAI](https://developers.openai.com/api/docs/guides/function-calling)

La conversazione rimane in memoria nel browser e si azzera al ricaricamento dell’app, all’uscita dall’account o al cambio di account. fitTrackr invia a OpenAI il nuovo messaggio, fino a quattro scambi precedenti e gli eventuali dati restituiti dagli strumenti durante la richiesta. L’API riceve `store: false`. I log di monitoraggio di OpenAI seguono regole separate. Supabase conserva le registrazioni del diario e una ricevuta per richiesta, utile a evitare duplicati se lo stesso invio viene ritentato. [Controlli sui dati dell’API OpenAI](https://developers.openai.com/api/docs/guides/your-data)

Sagebite offre informazioni generali e supporto per il diario. Per diagnosi o un piano alimentare clinico, rivolgiti a un professionista qualificato. Per stimare un pasto da un’immagine usa la funzione [Pasti occasionali da foto](pasti-da-foto.md).

## Configurazione e pubblicazione

Sul progetto Supabase collegato, verifica il dry-run e applica `20261121220000_fitness_chat_diary` se è pendente. Pubblica poi la Edge Function e infine il frontend. Il flag `--use-api` include i file del catalogo condivisi con l’app. [Flusso del database condiviso](../supabase/README.md)

```bash
supabase db push --linked --dry-run
supabase db push --linked
supabase functions deploy fittrackr-chat --no-verify-jwt --use-api
```

La funzione legge il secret `OPENAI_API_KEY` lato server. Per la chat il codice usa `gpt-4.1-mini` come valore predefinito. In produzione Sagebite usa `OPENAI_FITTRACKR_CHAT_MODEL=gpt-6.2-sol`. La funzione imposta `reasoning.effort` a `low` su ogni chiamata a questo modello. [Modello GPT‑6.2 Sol](https://developers.openai.com/api/docs/models/gpt-6.2-sol)

Il 21 novembre 2026 la versione con accesso al diario è stata pubblicata su Supabase e Vercel. Build, lint e 633 test sono passati. Le verifiche con dati sintetici hanno coperto isolamento degli account, ritentativi, rimanenze dei piatti pronti e aggiornamento di **Pasti** dopo la conferma su mobile e desktop. In produzione è stato verificato il rifiuto di una richiesta senza sessione. La registrazione autenticata in produzione resta da verificare. [Commit `5b541f1`](https://github.com/Luca404/fitness-tracker/commit/5b541f1f53ab1930876826faac73d571db43e670) · [Deploy Vercel](https://vercel.com/luca404s-projects/fitness-tracker/AGivq1cF26uVEjYCCzoQHbTqyLK2)
