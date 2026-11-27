# Schermate e navigazione di fitTrackr mobile

## Come ci si muove

La proposta riprende le cinque sezioni che chi usa fitTrackr conosce già. Nell’app completa **Pasti** apre il diario di oggi. Una barra in basso porta a **Fitness · Cucina · Pasti · Peso · Storico**. Ogni voce ha icona ed etichetta. La testata offre l’accesso a **Impostazioni** dalle schermate principali. **Punti e costanza** si apre dal punteggio in testata e **Sagebite** dal diario pasti. [Navigazione web attuale](../../src/components/layout/Layout.tsx)

Ogni sezione conserva posizione nella lista, filtri e schermata aperta quando si passa a un’altra. La data del diario accompagna chi passa da Pasti a Fitness per controllare lo stesso giorno. **Oggi** permette di tornare con un tocco. Un dettaglio aperto da Storico riporta allo stesso punto di Storico con **Indietro**.

Registrazione account, sessione palestra ed editor con più passaggi occupano lo schermo intero. Le scelte brevi, come il momento del pasto o la data, si aprono in un pannello dal basso. Indietro chiude prima il pannello, poi torna alla schermata di provenienza. Durante una sessione palestra uscire dalla pagina salva il punto raggiunto. Solo **Completa allenamento** conclude la sessione.

## Accesso e primo avvio

Su Android **Accedi** compare al primo avvio, dopo l’uscita e dopo 30 giorni senza aprire l’app. L’app supporta email e password, usa il browser per conferma email e cambio password e offre il selettore Google nativo negli ambienti configurati. La tabella descrive anche i passaggi previsti per il flusso completo. [Accesso Android](accesso-android.md)

| Schermata | Azione e destinazione |
| --- | --- |
| **Accedi** | Entrare con email e password dell’account Trackrs oppure con **Continua con Google**. Sono disponibili anche **Crea account** e **Password dimenticata?**. Un account con profilo completo entra direttamente nell’app. |
| **Crea account** | Inserire email, password e conferma. Gli errori indicano il campo da correggere e conservano i dati già inseriti. Dopo l’invio, mostrare **Controlla la tua email** con la possibilità di tornare ad Accedi. Usare lo stesso messaggio anche per un indirizzo già registrato. |
| **Conferma email** | Il link torna all’app. Verificato il collegamento, una sessione valida prosegue al profilo, altrimenti si apre Accedi. Un link scaduto offre un nuovo invio. |
| **Recupera password** | Inserire l’email e mostrare la conferma di invio. Il link di recupero ha priorità sulla schermata corrente e apre **Nuova password**. Dopo la conferma della nuova password, **Vai a fitTrackr** riprende il percorso dell’account. Un link scaduto riapre la richiesta. |
| **Configura profilo** | Per un profilo nuovo, seguire i cinque passaggi del web: dati fisici, obiettivo, stile di vita, allenamento di forza, riepilogo dei target. **Indietro** conserva le risposte. **Conferma** salva e apre la guida rapida, che si può saltare o rivedere dalle impostazioni. |
| **Riapertura** | Con account già riconosciuto e dati presenti sul telefono, mostrare subito il contenuto locale. Un errore di rete durante la lettura del profilo offre **Riprova**. Solo un profilo verificato come mancante avvia la configurazione. Se occorre autenticarsi di nuovo, conservare le operazioni in attesa per lo stesso account. |

Il primo accesso, la conferma dell’indirizzo e il recupero password richiedono rete. La guida usa dati dimostrativi separati dal diario personale. [Accesso Trackrs](../../docs/autenticazione.md) · [Configurazione del profilo](../../src/pages/OnboardingPage.tsx) · [Guida rapida](../../docs/tutorial.md)

### Accesso con Google e altri account

**Continua con Google** è previsto sia in **Accedi** sia in **Crea account**. L’utente sceglie il proprio account Google e torna a fitTrackr. Se ha già un profilo associato, ritrova il diario e le schede. Al primo ingresso con un nuovo account passa a **Configura profilo**. Se annulla la scelta, torna alla schermata di partenza e può riprovare o usare email e password.

Il pulsante Android si abilita con il Client ID Web di Google. Per completare l’accesso serve attivare anche il provider Google nel progetto Supabase. Per il futuro si propone di valutare **Continua con Microsoft** e **Accedi con Apple**, quest’ultimo in vista dell’app iPhone. [Configurazione Google per Android](accesso-android.md#accesso-con-google)

## Le cinque sezioni

| Sezione | Prima schermata | Pagine e azioni raggiungibili |
| --- | --- | --- |
| **Fitness** | **Allenamenti** mostra la sessione in corso, le schede personali e le attività della data selezionata. Se c’è una sessione aperta, **Riprendi** è l’azione principale. | **Dettaglio scheda** → avvia sessione o modifica esercizi e ordine. **Sessione** → registra carico e ripetizioni, aggiungi serie, completa e controlla il riepilogo. **Registra attività** → scegli attività, durata ed eventuale distanza. **Progressi** → scegli esercizio e variante per vedere le prestazioni nelle sessioni completate. |
| **Cucina** | Due viste, **Ingredienti** e **Piatti**, entrambe con ricerca. Qui si preparano gli elementi da riutilizzare nel diario. | **Ingrediente** → consulta o modifica quantità di riferimento e valori nutrizionali. **Aggiungi ingrediente** → manuale, codice a barre o foto dell’etichetta, con revisione. **Ricetta** → scegli ingredienti e porzioni. **Preparazione** → registra peso cotto e consulta grammi residui. **Registra porzione** apre il diario alla scelta di data e pasto. |
| **Pasti** | Data, energia e macronutrienti, poi voci per colazione, pranzo, cena, spuntini e bevande. **Aggiungi pasto** avvia una registrazione. | Scegli momento e fonte → ingrediente, ricetta, piatto pronto o foto → verifica quantità → **Registra**. Si torna al giorno scelto con la nuova voce visibile. Il dettaglio permette di correggerla o eliminarla. Dal riepilogo si raggiungono **Buone abitudini** e il dettaglio dei giorni considerati. |
| **Peso** | Ultima pesata con data, andamento rispetto all’obiettivo e lista delle misurazioni. | **Registra peso** apre data e valore in kg, con il formato numerico scelto. Dopo il salvataggio la misura compare nell’elenco e aggiorna il grafico. Se manca una prima misurazione, la pagina offre direttamente l’inserimento. |
| **Storico** | Selezione del periodo, copertura dei dati e andamenti di alimentazione e attività. | Toccare un giorno apre il dettaglio di pasti e allenamenti. I giorni senza registrazioni sono riconoscibili e le medie seguono le regole del web. Un periodo scaricato solo in parte mostra quali giorni devono ancora essere recuperati. |

**Punti e costanza** ha due viste: **I miei punti** con serie di giorni consecutivi e dettaglio dei punti per data, e **Classifica** con posizione e nome utente. **Sagebite** apre la conversazione sulla giornata selezionata, con testo o dettatura. Una registrazione riuscita offre **Apri nel diario**. Analisi delle foto, consultazione di cataloghi remoti e risposte dell’assistente segnalano quando serve una connessione. [Punti e classifica](../../docs/gamification.md) · [Sagebite](../../docs/sagebite.md) · [Pasti da foto](../../docs/pasti-da-foto.md)

## Impostazioni

La pagina iniziale è un elenco di voci con il valore corrente dove aiuta a scegliere, per esempio il separatore decimale o il numero di modifiche da inviare.

| Voce | Contenuto e comportamento |
| --- | --- |
| **Account** | Email dell’account attivo, modifica del nome utente della classifica, recupero password ed **Esci**. Se ci sono scritture in attesa, mostrarne il numero prima dell’uscita. L’utente può tornare alla sincronizzazione oppure uscire conservando i dati privati fino al prossimo accesso con lo stesso account. |
| **Profilo e obiettivi** | Dati fisici, attività, obiettivo e valori correnti di calorie e macronutrienti. Distinguere **Modifica target** da **Ricalcola dal profilo**. Mostrare il risultato prima di confermare la modifica. |
| **Lingua** | Scegliere **Lingua del dispositivo** o **Italiano**. La scelta esplicita vale per questa app e si conserva al riavvio. Con una lingua di sistema ancora priva di traduzione viene mostrato l’italiano. |
| **Aspetto** | Scegliere **Diario**, **Essenziale**, **Vivace** o **Quaderno**. Il tema si applica subito a tutta l’app e si conserva sul dispositivo. In Pasti, Essenziale compatta le righe e Vivace aggiunge le emoji ai momenti del pasto. |
| **Formato dei numeri** | Scelta tra punto e virgola con anteprima, per esempio 72.5 kg oppure 72,5 kg. Applicarla anche agli editor di peso e carico. |
| **Promemoria** | Proposta mobile. Scegliere il promemoria per la pesata o l’allenamento, i giorni e l’ora. Chiedere il permesso quando viene attivato il primo avviso. Il tocco sulla notifica apre la relativa funzione. |
| **Dati e sincronizzazione** | Ultimo aggiornamento, operazioni in attesa ed eventuali conflitti. **Riprova** ripete l’invio. Un conflitto apre il confronto fra le due modifiche prima di scegliere quale conservare. |
| **Guida e informazioni** | Riaprire il tutorial con dati di esempio, consultare le fonti dei dati alimentari e vedere la versione installata. Uscendo dalla guida si torna alle impostazioni. |

## Comportamenti da provare sul telefono

- **Diario offline.** Dopo un accesso online, riaprire un giorno scaricato in modalità aereo. Un giorno conosciuto senza pasti offre **Aggiungi pasto**. Un giorno mai scaricato mostra **Giornata da scaricare**. Chi consulta lo storico può così distinguere un giorno vuoto da dati ancora indisponibili.
- **Allenamento interrotto.** Registrare una serie, bloccare il telefono e riaprire Fitness. **Riprendi** ritrova l’esercizio e i valori salvati. Nell’editor si può riordinare dalla maniglia oppure con **Sposta su** e **Sposta giù**. Il gesto lascia libero lo scorrimento verticale del resto della riga.
- **Salvataggio e ritorno della rete.** Una modifica locale mostra **Salvato sul dispositivo**. Alla riconnessione si sincronizza una sola volta. Se l’invio fallisce, dalla voce interessata si raggiunge **Dati e sincronizzazione**.
- **Ritorno da un dettaglio.** Aprire ieri da Storico, correggere una voce del diario e tornare indietro. Periodo, data e posizione nell’elenco restano quelli scelti.
- **Accessibilità.** Provare registrazione, salvataggio di una serie e ritorno al diario con lettore di schermo, testo ingrandito e animazioni ridotte. Carichi, unità e stati di sincronizzazione devono essere comprensibili anche senza colore o movimento.

## Ordine di realizzazione

La struttura Android si apre su **Pasti** e comprende da subito le cinque sezioni. Prima di sviluppare le singole pagine si definisce il contratto di sincronizzazione di tutta fitTrackr con il progetto Supabase esistente. Le pagine si collegano progressivamente allo stesso archivio locale. [Piano tecnico](piano.md) · [Copertura dei dati per area](dati-offline.md)
